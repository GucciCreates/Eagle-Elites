import type { BrowserContext, Page } from '@playwright/test';

const b64 = (value: string) => Buffer.from(value).toString('base64url');

/** A signed-in session cookie the fake Supabase accepts (HS256 → checked via /auth/v1/user). */
export async function signIn(context: BrowserContext) {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 3600;
  const jwt = [
    b64(JSON.stringify({ alg: 'HS256', typ: 'JWT' })),
    b64(JSON.stringify({ sub: 'u1', exp, iat: now, role: 'authenticated', aud: 'authenticated' })),
    'c2ln',
  ].join('.');
  const session = {
    access_token: jwt,
    refresh_token: 'r',
    expires_at: exp,
    expires_in: 3600,
    token_type: 'bearer',
    user: { id: 'u1', aud: 'authenticated', role: 'authenticated', email: 'staff@example.test' },
  };
  await context.addCookies([
    { name: 'sb-127-auth-token', value: `base64-${b64(JSON.stringify(session))}`, domain: '127.0.0.1', path: '/' },
  ]);
}

// The fake backend has no realtime (WebSocket) server; that one failure is
// expected in tests and says nothing about the page.
const IGNORED = [/\/realtime\/v1\/websocket/];

/** Collects uncaught errors and console errors for a page. */
export function trackErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    const text = message.text();
    if (message.type() === 'error' && !IGNORED.some((pattern) => pattern.test(text))) errors.push(text);
  });
  return errors;
}

export async function horizontalOverflow(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
}
