import { test, expect } from '@playwright/test';

test.describe('M6 PWA Offline, Keyboard Navigation & Reduced Motion', () => {
  test('registers Service Worker under Trusted Types CSP and works completely offline after first load', async ({
    page,
    context,
  }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Chào');

    // Wait for Service Worker to register and become active controlling this page
    const swActive = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return false;
      const reg = await navigator.serviceWorker.ready;
      return Boolean(reg.active);
    });
    expect(swActive).toBe(true);

    // Reload once so SW claims the client cleanly
    await page.reload();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Chào');

    // Go truly OFFLINE
    await context.setOffline(true);

    // Offline banner should appear
    await expect(page.getByText('Đang chạy ngoại tuyến')).toBeVisible();

    // Reload completely offline and navigate to QA & Read + grade an answer offline!
    await page.reload();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Chào');

    await page.goto('/#/qa/B1-T01-1?bai=1&tab=pic');
    await expect(page.locator('picture img')).toBeVisible();
    await page.getByLabel('Câu trả lời của em').fill('roshia desu');
    await page.getByRole('button', { name: 'Chấm câu trả lời' }).click();
    await expect(page.getByText(/100%/)).toBeVisible();

    await page.goto('/#/read/L1.1?bai=1');
    await expect(page.locator('ruby').first()).toBeVisible();

    await context.setOffline(false);
    expect(consoleErrors).toEqual([]);
  });

  test('supports full keyboard navigation, skip link, lang="ja", and prefers-reduced-motion', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/#/qa?bai=1&tab=rand');

    // First Tab reaches skip-link
    await page.keyboard.press('Tab');
    const skip = page.locator('a.skip-link');
    await expect(skip).toBeFocused();

    // Keyboard ArrowRight on QA Tabs
    const randTab = page.getByRole('tab', { name: 'Ngẫu nhiên' });
    await randTab.focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('tab', { name: /Có tranh/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );

    // Verify Japanese elements carry lang="ja"
    await page.goto('/#/read/L1.1?bai=1');
    await expect(page.locator('ruby[lang="ja"]').first()).toBeVisible();
    const rubyCount = await page.locator('ruby[lang="ja"]').count();
    expect(rubyCount).toBeGreaterThan(0);

    // Verify reduced motion duration clamp
    const transitionSec = await page.evaluate(() => {
      const btn = document.querySelector('button');
      return btn ? parseFloat(getComputedStyle(btn).transitionDuration) : 1;
    });
    expect(transitionSec).toBeLessThanOrEqual(0.001);
  });
});
