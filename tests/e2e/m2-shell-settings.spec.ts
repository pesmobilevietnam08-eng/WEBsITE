import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('M2 App Shell, Settings, Legacy Migration & XSS Protection', () => {
  test('migrates legacy rbl-jpd113-web-v2 progress, toggles theme/furigana, and neutralizes XSS/malicious import', async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    const dialogs: string[] = [];
    const externalRequests: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(err.message));
    page.on('dialog', async (d) => {
      dialogs.push(d.message());
      await d.dismiss();
    });
    page.on('request', (req) => {
      const url = req.url();
      if (
        !url.startsWith('http://127.0.0.1:') &&
        !url.startsWith('data:') &&
        !url.startsWith('blob:')
      ) {
        externalRequests.push(url);
      }
    });

    // Seed legacy v2 storage before app boots
    await page.addInitScript(() => {
      if (!window.localStorage.getItem('jpd113.v3')) {
        window.localStorage.setItem(
          'rbl-jpd113-web-v2',
          JSON.stringify({
            _name: 'ナム',
            _voice: 'Google 日本語',
            'B1-T01-1': { n: 2, best: 100, last: 'ロシアです' },
            'R:L1.1': { n: 1, best: 90, last: 'かぞくのしごとです' },
          }),
        );
      }
    });

    await page.goto('/#/settings');
    await expect(page.getByRole('heading', { level: 1, name: 'Cài đặt' })).toBeVisible();

    // Verify legacy name migrated into v3 without deleting legacy key
    const nameInput = page.getByLabel(/Tên dùng trong câu hỏi/);
    await expect(nameInput).toHaveValue('ナム');
    const storageCheck = await page.evaluate(() => ({
      v2Exists: window.localStorage.getItem('rbl-jpd113-web-v2') !== null,
      v3: JSON.parse(window.localStorage.getItem('jpd113.v3') || '{}'),
    }));
    expect(storageCheck.v2Exists).toBe(true);
    expect(storageCheck.v3.attempts['B1-T01-1']?.best).toBe(100);
    expect(storageCheck.v3.readAttempts['L1.1']?.best).toBe(90);

    // Attempt XSS via learner name
    await nameInput.fill('<img src=x onerror=alert(1)>');
    await page.getByRole('button', { name: 'Lưu tên' }).click();
    expect(dialogs).toEqual([]);
    await expect(page.locator('img[src="x"]')).toHaveCount(0);

    // Attempt malicious prototype-pollution JSON import
    const fileInput = page.getByLabel('Chọn tệp JSON sao lưu tiến độ');
    await fileInput.setInputFiles({
      name: 'evil.json',
      mimeType: 'application/json',
      buffer: Buffer.from('{"__proto__":{"polluted":true},"format":"jpd113-backup"}'),
    });
    await expect(page.getByRole('alert')).toContainText(/không an toàn|không đúng định dạng/i);

    // Toggle Furigana switch & Dark theme
    const furiganaSwitch = page.getByRole('switch', { name: /Furigana/i });
    await furiganaSwitch.click();
    await expect(page.locator('html')).toHaveClass(/hide-furigana/);

    await page.getByRole('button', { name: 'Tối (Sumi)' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    // Verify axe accessibility in dark mode on Settings page
    const axe = await new AxeBuilder({ page }).analyze();
    const serious = axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(serious).toEqual([]);

    expect(externalRequests).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });
});
