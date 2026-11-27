import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
      // Next's guard package throws outside a React Server environment.
      'server-only': fileURLToPath(new URL('./tests/support/server-only.ts', import.meta.url)),
    },
  },
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
    // Dates in the app are Pakistan-based; pin the runner's zone so results
    // don't depend on the machine running the tests.
    env: { TZ: 'UTC' },
  },
});
