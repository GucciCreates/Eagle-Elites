import { defineConfig, devices } from '@playwright/test';

// End-to-end tests run the production build against tests/e2e/fake-supabase.mjs.
const SUPABASE_URL = 'http://127.0.0.1:54321';
const appEnv = {
  NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'e2e-placeholder',
};

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'off',
    ...devices['Desktop Chrome'],
    viewport: { width: 1366, height: 900 },
  },
  webServer: [
    {
      command: 'node tests/e2e/fake-supabase.mjs',
      url: `${SUPABASE_URL}/rest/v1/routes`,
      reuseExistingServer: !process.env.CI,
    },
    {
      // Build against the fake backend so the homepage is prerendered with sample fares.
      command: process.env.E2E_SKIP_BUILD ? 'npm run start' : 'npm run build && npm run start',
      url: 'http://127.0.0.1:3000/auth/login',
      env: appEnv,
      timeout: 300_000,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
