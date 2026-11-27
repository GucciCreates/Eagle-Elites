import { expect, test } from '@playwright/test';
import { horizontalOverflow, trackErrors } from './helpers';

test.describe('public site', () => {
  test('landing page shows live fares and the fare calculator works', async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Your daily ride to campus');
    await expect(page.getByText('Wah Cantt → Islamabad').first()).toBeVisible();
    await expect(page.getByText('Only 3 seats left').first()).toBeVisible();

    const calculator = page.locator('dl[aria-live="polite"]');
    await page.getByLabel('Your route').selectOption('r3');
    await page.getByRole('switch', { name: /Air-conditioned/ }).click();
    await expect(calculator).toContainText('PKR 11,500'); // 11,000 + 500 AC
    await expect(calculator).toContainText('PKR 12,500'); // + 1,000 reservation
    await expect(page.getByRole('link', { name: 'Join the waitlist' })).toBeVisible(); // r3 is full

    expect(errors).toEqual([]);
  });

  test('area search offers to request a new stop', async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder(/Type your sector or area/).fill('Lahore');
    await expect(page.getByRole('link', { name: /Request a stop at “Lahore”/ })).toHaveAttribute('href', /wa\.me/);
  });

  test('demo opens without touching the real session', async ({ page }) => {
    await page.goto('/auth/login');
    await page.getByRole('button', { name: 'Try the demo' }).click();
    await expect(page).toHaveURL(/\/demo$/);
    await expect(page.getByText(/viewing a demo with sample data/)).toBeVisible();
    expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
  });

  test('landing page does not download the sign-in SDK before it loads', async ({ page }) => {
    let loaded = false;
    const early: Promise<string>[] = [];
    page.on('load', () => { loaded = true; });
    page.on('response', (response) => {
      if (!loaded && response.url().endsWith('.js')) early.push(response.text().catch(() => ''));
    });
    await page.goto('/', { waitUntil: 'load' });
    const scripts = await Promise.all(early);
    expect(scripts.length).toBeGreaterThan(0);
    expect(scripts.some((source) => source.includes('GoTrueClient')), 'Supabase SDK loaded before the landing page finished').toBe(false);
  });

  test('unknown pages show the not-found screen', async ({ page }) => {
    const response = await page.goto('/this-page-does-not-exist');
    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { name: /isn’t here/ })).toBeVisible();
  });
});

test.describe('phone layout', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  for (const path of ['/', '/auth/login', '/auth/signup', '/demo']) {
    test(`${path} has no sideways scrolling`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
    });
  }
});
