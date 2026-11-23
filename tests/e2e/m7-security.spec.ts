import { test, expect } from '@playwright/test';

test.describe('M7 Security E2E — XSS, Malicious Import, CSP Headers, Zero External Calls & Promo Default OFF', () => {
  test('serves strict security headers on production responses and makes 0 external requests', async ({
    page,
  }) => {
    const externalRequests: string[] = [];
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(err.message));
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

    const response = await page.goto('/');
    expect(response).not.toBeNull();
    const headers = response!.headers();
    expect(headers['content-security-policy']).toContain("default-src 'none'");
    expect(headers['content-security-policy']).toContain("script-src 'self'");
    expect(headers['content-security-policy']).toContain("style-src 'self'");
    expect(headers['content-security-policy']).toContain("require-trusted-types-for 'script'");
    expect(headers['content-security-policy']).not.toMatch(/unsafe-inline|unsafe-eval/i);
    expect(headers['strict-transport-security']).toContain('max-age=63072000');
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['referrer-policy']).toBe('no-referrer');
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['cross-origin-opener-policy']).toBe('same-origin');
    expect(headers['cross-origin-resource-policy']).toBe('same-origin');
    expect(headers['permissions-policy']).toContain('microphone=(self)');

    // M-05: Unhashed /images/* must NOT be cached immutable for 1 year
    const imgResp = await page.request.get('/images/pictures/B1-T01.png');
    expect(imgResp.status()).toBe(200);
    expect(imgResp.headers()['cache-control']).not.toContain('immutable');

    // L-08: Skip link moves focus to #main-content without breaking HashRouter route
    await page.goto('/#/read');
    await page.locator('a.skip-link').focus();
    await page.keyboard.press('Enter');
    expect(page.url()).toContain('#/read');
    const activeId = await page.evaluate(() => document.activeElement?.id);
    expect(activeId).toBe('main-content');

    // Visit every primary screen and ensure 0 external requests & promo OFF by default
    for (const route of [
      '/#/',
      '/#/read',
      '/#/read/L1.1',
      '/#/qa',
      '/#/qa/B1-T01-1',
      '/#/exam',
      '/#/settings',
    ]) {
      await page.goto(route);
      await expect(page.locator('a[href*="manabiman.io.vn"]')).toHaveCount(0);
    }

    expect(externalRequests).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test('neutralizes XSS payloads in learner name, rejects malicious imports, and recovers from corrupted storage', async ({
    page,
  }) => {
    const dialogs: string[] = [];
    const consoleErrors: string[] = [];
    page.on('dialog', async (d) => {
      dialogs.push(d.message());
      await d.dismiss();
    });
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    // Corrupt localStorage before boot -> app must recover cleanly without crashing
    await page.addInitScript(() => {
      if (!window.sessionStorage.getItem('m7-seeded')) {
        window.sessionStorage.setItem('m7-seeded', '1');
        window.localStorage.setItem('jpd113.v3', '{corrupted_json:::');
      }
    });

    await page.goto('/#/settings');
    await expect(page.getByRole('heading', { level: 1, name: 'Cài đặt' })).toBeVisible();

    // Inject XSS into learner name
    const nameInput = page.getByLabel(/Tên dùng trong câu hỏi/);
    await nameInput.fill('"><img src=x onerror=alert(1)><svg onload=alert(2)>');
    await page.getByRole('button', { name: 'Lưu tên' }).click();

    // Navigate to QA free question and Dashboard -> verify no XSS execution or DOM injection
    await page.goto('/#/qa/KT113-B1-01?bai=1&tab=free');
    await page.getByRole('button', { name: /Hiện chữ câu hỏi/ }).click();
    await expect(page.locator('img[src="x"]')).toHaveCount(0);
    await expect(page.locator('svg[onload]')).toHaveCount(0);

    await page.goto('/#/');
    await expect(page.locator('img[src="x"]')).toHaveCount(0);
    expect(dialogs).toEqual([]);

    // Test malicious JSON imports in Settings
    await page.goto('/#/settings');
    const fileInput = page.getByLabel('Chọn tệp JSON sao lưu tiến độ');

    // 1. Prototype pollution
    await fileInput.setInputFiles({
      name: 'proto.json',
      mimeType: 'application/json',
      buffer: Buffer.from('{"__proto__":{"polluted":true},"constructor":{"prototype":{"x":1}}}'),
    });
    await expect(page.getByRole('alert')).toBeVisible();
    const polluted = await page.evaluate(() => (({}) as Record<string, unknown>).polluted === true);
    expect(polluted).toBe(false);

    // 2. Oversized > 1 MB payload
    await fileInput.setInputFiles({
      name: 'dos.json',
      mimeType: 'application/json',
      buffer: Buffer.from('{"pad":"' + 'a'.repeat(1_200_000) + '"}'),
    });
    await expect(page.getByRole('alert')).toContainText(/1 MB/);

    // 3. Opt-in Promo toggle renders safe external link with rel="noopener noreferrer"
    const promoSwitch = page.getByRole('switch', { name: /JPDspeak/i });
    await promoSwitch.click();
    await page.goto('/#/qa/B1-T01-1?bai=1&tab=pic');
    await page.getByLabel('Câu trả lời của em').fill('roshia desu');
    await page.getByRole('button', { name: 'Chấm câu trả lời' }).click();
    const extLink = page.locator('a[href^="https://manabiman.io.vn/"]');
    await expect(extLink).toHaveCount(1);
    await expect(extLink).toHaveAttribute('rel', 'noopener noreferrer');
    await expect(extLink).toHaveAttribute('target', '_blank');

    // M-07: "Xoá toàn bộ dữ liệu" truly removes jpd113.v3 from localStorage (no immediate re-write)
    await page.goto('/#/settings');
    await page.getByRole('button', { name: 'Xoá toàn bộ dữ liệu' }).click();
    await page.getByRole('button', { name: 'Xoá vĩnh viễn' }).click();
    await page.waitForTimeout(200);
    const remainingStorage = await page.evaluate(() => ({
      v3: window.localStorage.getItem('jpd113.v3'),
      v2: window.localStorage.getItem('rbl-jpd113-web-v2'),
    }));
    expect(remainingStorage.v3).toBeNull();
    expect(remainingStorage.v2).toBeNull();

    expect(consoleErrors).toEqual([]);
  });
});
