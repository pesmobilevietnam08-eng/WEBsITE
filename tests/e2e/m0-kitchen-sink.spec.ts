import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('M0 Foundation — Kitchen Sink, CSP & Accessibility', () => {
  test('renders kitchen sink with 0 CSP violations, 0 external requests, and 0 axe serious/critical issues', async ({
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

    await page.goto('/#/kitchen-sink');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // Verify no horizontal scroll
    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasOverflow).toBe(false);

    // Axe check light mode
    const lightResults = await new AxeBuilder({ page }).analyze();
    const lightSerious = lightResults.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    );
    expect(lightSerious).toEqual([]);

    const vp = (page.viewportSize()?.width ?? 1440) < 600 ? 'mobile' : 'desktop';
    await page.screenshot({
      path: `docs/screenshots/m0-kitchen-sink-${vp}-light.png`,
      fullPage: true,
    });

    // Toggle to dark mode & wait for CSS transitions to settle before axe contrast audit
    await page.getByRole('button', { name: 'Chế độ tối' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.waitForTimeout(250);

    const darkResults = await new AxeBuilder({ page }).analyze();
    const darkSerious = darkResults.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    );
    expect(darkSerious).toEqual([]);

    await page.screenshot({
      path: `docs/screenshots/m0-kitchen-sink-${vp}-dark.png`,
      fullPage: true,
    });

    expect(externalRequests).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });
});
