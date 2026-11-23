import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('M5 Dashboard, Smart Review, Search & Timed Mock Exam', () => {
  test('renders dashboard metrics, smart review, offline search, and completes full 6-question mock exam', async ({
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

    // 1. Dashboard & offline quick search
    await page.goto('/#/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Chào');
    await expect(page.getByRole('heading', { name: 'Câu nên ôn hôm nay' })).toBeVisible();

    // Axe check on Dashboard
    const dashAxe = await new AxeBuilder({ page }).analyze();
    expect(
      dashAxe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical'),
    ).toEqual([]);

    // Search for "ロシア" across offline catalog
    const searchInput = page.getByRole('searchbox');
    await searchInput.fill('ロシア');
    await expect(page.getByRole('button', { name: /B1-T01-1/ })).toBeVisible();

    // 2. Navigate to Mock Exam and complete all 6 steps
    await page.goto('/#/exam');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Thi thử có giới hạn thời gian' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Bài 1' }).click();
    await page.getByRole('button', { name: 'Bắt đầu thi thử (6 câu)' }).click();

    for (let step = 1; step <= 6; step++) {
      await expect(page.getByText(new RegExp(`Câu ${step}/6`))).toBeVisible();
      await page.getByLabel('Câu trả lời của em').fill('はい、そうです。');
      if (step < 6) {
        await page.getByRole('button', { name: 'Câu tiếp theo' }).click();
      } else {
        await page.getByRole('button', { name: /Nộp bài/ }).click();
      }
    }

    await expect(page.getByRole('heading', { level: 1, name: 'Báo cáo tổng kết' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Xuất báo cáo/ })).toBeVisible();

    // Axe check on Mock Exam report
    const reportAxe = await new AxeBuilder({ page }).analyze();
    expect(
      reportAxe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical'),
    ).toEqual([]);

    // Return to Dashboard -> verify streak >= 1 & exam history appears
    await page.goto('/#/');
    await expect(page.getByText('1 ngày', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Lịch sử thi thử gần đây' })).toBeVisible();

    expect(externalRequests).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });
});
