import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('M3 QA (Vấn đáp) — List, Picture Practice/Result, Free Practice/Result & Random', () => {
  test('completes full pic, free, and random QA flows with exact grading and 0 a11y/CSP issues', async ({
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

    // 1. Open QA List -> Có tranh tab -> Câu 1 (B1-T01-1)
    await page.goto('/#/qa');
    await expect(page.getByRole('heading', { level: 1, name: 'Luyện vấn đáp' })).toBeVisible();
    await page.getByRole('tab', { name: /Có tranh/ }).click();
    await page.getByRole('button', { name: /^Câu 1\b/ }).click();

    // 2. Picture practice screen
    await expect(page.locator('picture img')).toBeVisible();
    await page.getByRole('button', { name: /Hiện chữ câu hỏi/ }).click();
    await expect(page.getByText('ソフィアさんのおくにはどちらですか')).toBeVisible();

    // Type Romaji answer with R11 error ("roshia jin desu")
    const answerBox = page.getByLabel('Câu trả lời của em');
    await answerBox.fill('roshia jin desu');
    await expect(page.getByText('Đọc theo Romaji:')).toBeVisible();
    await page.getByRole('button', { name: 'Chấm câu trả lời' }).click();

    // Verify 80% (12/15) + R11 deduction
    await expect(page.getByText(/80%/)).toBeVisible();
    await expect(page.getByText('R11', { exact: true }).first()).toBeVisible();

    // Axe check on QA pic result
    const picResAxe = await new AxeBuilder({ page }).analyze();
    expect(
      picResAxe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical'),
    ).toEqual([]);

    // Retry with full score answer ("roshia desu")
    await page.getByRole('button', { name: 'Nói lại câu này' }).click();
    await page.getByLabel('Câu trả lời của em').fill('roshia desu');
    await page.getByRole('button', { name: 'Chấm câu trả lời' }).click();
    await expect(page.getByText(/100%/)).toBeVisible();
    await expect(page.getByText(/Không bị trừ điểm nào/)).toBeVisible();

    // 3. Go back -> Không tranh -> Câu 1 (KT113-B1-01)
    await page.getByRole('button', { name: 'Về danh sách' }).click();
    await page.getByRole('tab', { name: /Không tranh/ }).click();
    await page.getByRole('button', { name: /^Câu 1\b/ }).click();
    await page.getByLabel('Câu trả lời của em').fill('Min desu');
    await page.getByRole('button', { name: 'Chấm câu trả lời' }).click();
    await expect(page.getByText(/Phản hồi tham khảo \(3\/3 tiêu chí đạt\)/)).toBeVisible();

    // 4. Random draw flow
    await page.getByRole('button', { name: 'Về danh sách' }).click();
    await page.getByRole('tab', { name: 'Ngẫu nhiên' }).click();
    await page.getByRole('button', { name: 'Bắt đầu câu ngẫu nhiên' }).click();
    await expect(page.getByText(/Ngẫu nhiên · Bài 1/)).toBeVisible();

    expect(externalRequests).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });
});
