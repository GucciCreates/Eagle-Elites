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

  test('admin Fees, Messages and Announcements tabs open', async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto('/admin/dashboard');
    const sidebar = page.getByRole('complementary', { name: 'Admin sections' });
    await sidebar.getByRole('button', { name: /Fees/ }).click();
    await expect(page.getByRole('heading', { name: 'Fee collection dashboard' })).toBeVisible();
    await sidebar.getByRole('button', { name: /Messages/ }).click();
    await expect(page.getByRole('heading', { name: 'Help Messages' })).toBeVisible();
    await sidebar.getByRole('button', { name: /Announcements/ }).click();
    await expect(page.getByText('Winter timings')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('signed-in staff see their dashboard link on the landing page', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'Open admin dashboard' }).first()).toBeVisible();
  });

  test('driver sees today’s roster from the privacy-safe roster function', async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto('/driver/dashboard');
    await expect(page.getByRole('heading', { name: 'Ayesha Khan' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Hira Malik' })).toBeVisible();
    await expect(page.getByRole('progressbar', { name: 'Roster marked' })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('admin morning checklist shows driver problems', async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto('/admin/dashboard');
    const checklist = page.getByRole('region', { name: 'Morning checklist' });
    await expect(checklist).toBeVisible();
    await expect(checklist.getByText('Problems reported by drivers today')).toBeVisible();
    await expect(checklist.getByText(/Heavy traffic · Imran Ali/)).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('admin Plan a Day, Staff Roles and Attendance tabs open', async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto('/admin/dashboard');
    const sidebar = page.getByRole('complementary', { name: 'Admin sections' });
    await sidebar.getByRole('button', { name: /Plan a Day/ }).click();
    await expect(page.getByRole('heading', { name: 'Plan a day' })).toBeVisible();
    await expect(page.getByText(/published automatically at about 9:30 PM/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Preview' })).toBeEnabled();
    await sidebar.getByRole('button', { name: /Staff Roles/ }).click();
    await expect(page.getByRole('heading', { name: 'Staff roles' })).toBeVisible();
    await sidebar.getByRole('button', { name: /Attendance/ }).click();
    await expect(page.getByRole('heading', { name: 'Absence alerts' })).toBeVisible();
    await sidebar.getByRole('button', { name: /Settings/ }).click();
    await expect(page.getByRole('heading', { name: 'Daily operations' })).toBeVisible();
    expect(errors.filter((e) => !/\/api\/admin\//.test(e) && !/status of 50[03]/.test(e))).toEqual([]);
  });

  test('driver can send trip updates and report a problem', async ({ page }) => {
    await page.goto('/driver/dashboard');
    const trip = page.getByRole('region', { name: 'Trip status' });
    await expect(trip).toBeVisible();
    await trip.getByRole('button', { name: 'morning' }).click();
    await expect(trip.getByRole('button', { name: /Left for pickups/ })).toBeVisible();
    await trip.getByRole('button', { name: /Report a problem/ }).click();
    await expect(trip.getByRole('radio', { name: 'Vehicle breakdown' })).toBeVisible();
  });

  test('accounting page loads', async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto('/admin/accounting');
    await expect(page.getByText('Expected Revenue')).toBeVisible();
    expect(errors).toEqual([]);
  });
});
