import { expect, test } from '@playwright/test';
import { horizontalOverflow, trackErrors } from './helpers';

test.describe('public site', () => {
  test('landing page shows live fares and the fare calculator works', async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Your daily ride to campus');
    const fares = page.locator('#fares');
    const airUni = fares.getByRole('listitem').filter({ hasText: 'E-9 / Air Uni' });
    await expect(airUni).toContainText('Hassan Abdal');
    await expect(airUni).toContainText('PKR 11,000');
    await expect(airUni).toContainText('Full · join waitlist');
    await expect(fares.getByText('Only 3 seats left')).toBeVisible();

    const calculator = page.locator('dl[aria-live="polite"]');
    await page.getByLabel('Your route').selectOption('r3');
    await page.getByRole('switch', { name: /Air-conditioned/ }).click();
    await expect(calculator).toContainText('PKR 11,500'); // 11,000 + 500 AC
    await expect(calculator).toContainText('PKR 12,500'); // + 1,000 reservation
    await expect(page.getByRole('link', { name: 'Join the waitlist' })).toBeVisible(); // r3 is full

    expect(errors).toEqual([]);
  });

  test('area search answers instantly with the route, fare and seats', async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto('/');
    await page.getByLabel('Is my area covered?').fill('b17');
    const hero = page.locator('#home');
    await expect(hero.getByText(/Yes, we pick up at/)).toContainText('B-17 MultiGardens');
    await expect(hero.getByText('Rawalpindi → H-11 / NUST')).toBeVisible();
    await expect(hero.getByRole('link', { name: /^Reserve/ }).first()).toHaveAttribute('href', '/auth/signup');
    // The route line switches to that route and marks the stop.
    await expect(page.getByRole('complementary', { name: 'Route line' }).getByText('Your stop')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('area search offers to request a new stop', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Is my area covered?').fill('Lahore');
    await expect(page.getByText(/isn.t on our list yet/)).toBeVisible();
    await expect(page.getByRole('link', { name: 'Ask for a stop here' })).toHaveAttribute('href', /wa\.me\/.*Lahore/);
  });

  test('campus pages list the routes to that campus', async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto('/campus/nust');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Daily transport to NUST');
    await expect(page.getByRole('heading', { name: 'Routes to NUST' })).toBeVisible();
    await expect(page.getByText('PKR 8,000')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('the portal can be added to the home screen', async ({ request }) => {
    const manifest = await (await request.get('/manifest.webmanifest')).json();
    expect(manifest).toMatchObject({ start_url: '/dashboard', display: 'standalone' });
  });

  test('demo opens without touching the real session', async ({ page }) => {
    await page.goto('/auth/login');
    await page.getByRole('button', { name: 'Try the demo' }).click();
    await expect(page).toHaveURL(/\/demo$/);
    await expect(page.getByText(/viewing a demo with sample data/)).toBeVisible();
    expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
  });

  test('demo rider can mark a day as not riding', async ({ page }) => {
    await page.goto('/demo');
    const days = page.getByRole('region', { name: /Days you won.t ride/ });
    await expect(days).toBeVisible();
    const first = days.getByRole('list', { name: 'Next two weeks' }).getByRole('button').nth(1);
    await first.click();
    await expect(first).toHaveAttribute('aria-pressed', 'true');
    await expect(days.getByRole('status')).toContainText('not riding');
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

  for (const path of ['/', '/campus/nust', '/auth/login', '/auth/signup', '/demo']) {
    test(`${path} has no sideways scrolling`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
    });
  }
});
