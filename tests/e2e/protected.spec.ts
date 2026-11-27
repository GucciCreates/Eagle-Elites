import { expect, test } from '@playwright/test';
import { signIn, trackErrors } from './helpers';

test.describe('route protection (signed out)', () => {
  for (const [path, login] of [
    ['/dashboard', '/auth/login'],
    ['/onboarding/profile', '/auth/login'],
    ['/admin/dashboard', '/admin/login'],
    ['/admin/accounting', '/admin/login'],
    ['/driver/dashboard', '/driver/login'],
  ]) {
    test(`${path} redirects to ${login}`, async ({ request }) => {
      const response = await request.get(path, { maxRedirects: 0 });
      expect(response.status()).toBe(307);
      expect(new URL(response.headers().location, 'http://127.0.0.1:3000').pathname).toBe(login);
    });
  }

  test('a forged session cookie is rejected', async ({ request }) => {
    const forged = 'base64-' + Buffer.from(JSON.stringify({ access_token: 'not-a-jwt', user: { id: 'u1' } })).toString('base64url');
    const response = await request.get('/admin/dashboard', {
      maxRedirects: 0,
      headers: { cookie: `sb-127-auth-token=${forged}` },
    });
    expect(response.status()).toBe(307);
  });
});

test.describe('signed-in staff', () => {
  test.beforeEach(async ({ context }) => signIn(context));

  test('admin dashboard loads with sidebar sections', async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto('/admin/dashboard');
    const sidebar = page.getByRole('complementary', { name: 'Admin sections' });
    await expect(sidebar).toBeVisible();
    await expect(sidebar.getByRole('button', { name: /Students/ })).toBeVisible();
    await expect(page.getByText('Total Students')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('driver sees today’s roster from the privacy-safe roster function', async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto('/driver/dashboard');
    await expect(page.getByRole('heading', { name: 'Ayesha Khan' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Hira Malik' })).toBeVisible();
    await expect(page.getByRole('progressbar', { name: 'Roster marked' })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('accounting page loads', async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto('/admin/accounting');
    await expect(page.getByText('Expected Revenue')).toBeVisible();
    expect(errors).toEqual([]);
  });
});
