import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('M4 Reading (Luyện đọc) — Passage List, Ruby/Furigana, Grading, DiffText & Errors', () => {
  test('completes reading practice with furigana toggle, exact 90% partial grading, DiffText, and 100% retry', async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    const externalRequests: string[] = [];
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

    await page.goto('/#/read');
    await expect(page.getByRole('heading', { level: 1, name: 'Luyện đọc đoạn văn' })).toBeVisible();

    // Switch Bài 3 to verify lazy loading 24 passages, then back to Bài 1
    await page.getByRole('button', { name: 'Bài 3' }).click();
    await expect(page.getByText('Bài 3: đã đọc 0/24 đoạn')).toBeVisible();
    await page.getByRole('button', { name: 'Bài 1' }).click();
    await expect(page.getByText('Bài 1: đã đọc 0/10 đoạn')).toBeVisible();

    // Open Đoạn 1 (L1.1)
    await page.getByRole('button', { name: /^Đoạn 1\b/ }).click();
    await expect(page.locator('ruby').first()).toBeVisible();

    // Toggle Furigana switch OFF -> hides <rt> via CSS class without re-render
    const furiSwitch = page.getByRole('switch', { name: /Furigana/i });
    await furiSwitch.click();
    await expect(page.locator('html')).toHaveClass(/hide-furigana/);
    await furiSwitch.click();
    await expect(page.locator('html')).not.toHaveClass(/hide-furigana/);

    // Submit with 1 missing char in 52才 (ごじゅうさい instead of ごじゅうにさい) -> 90%
    const textWithError =
      'かぞくの しごとです。ちちは ごじゅうさいの パイロットです。ははは しゃいんでは ありません。にほんごの きょうしです。あには カメラマンです。あねは ナースです。わたしは がくせいです。';
    await page.getByLabel('Em đọc').fill(textWithError);
    await page.getByRole('button', { name: 'Chấm bài đọc' }).click();

    await expect(page.getByText('90%').first()).toBeVisible();
    await expect(page.getByText('Chữ Hán (đúng 2/3 từ)')).toBeVisible();
    await expect(page.getByText('Katakana (đúng 3/3 từ)')).toBeVisible();
    await expect(page.getByText('Hiragana (đúng 52/52 chữ)')).toBeVisible();
    await expect(page.getByText('[に]')).toBeVisible();
    await expect(page.getByText(/Thiếu chữ/).first()).toBeVisible();

    // Axe accessibility audit on reading result
    const axeRes = await new AxeBuilder({ page }).analyze();
    expect(
      axeRes.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical'),
    ).toEqual([]);

    // Retry with 100% accurate reading
    await page.getByRole('button', { name: 'Đọc lại đoạn này' }).click();
    const perfectText =
      'かぞくの しごとです。ちちは ごじゅうにさいの パイロットです。ははは しゃいんでは ありません。にほんごの きょうしです。あには カメラマンです。あねは ナースです。わたしは がくせいです。';
    await page.getByLabel('Em đọc').fill(perfectText);
    await page.getByRole('button', { name: 'Chấm bài đọc' }).click();

    await expect(page.getByText('100%').first()).toBeVisible();
    await expect(page.getByText('Em đọc khớp hoàn toàn với bản mẫu.')).toBeVisible();

    expect(externalRequests).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });
});
