import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['tests/**/*.test.ts'],
    // One file at a time: tests share the local database.
    fileParallelism: false,
    // Fails loudly when the edge runtime is missing, and pays its cold
    // start outside any test's timeout. See tests/global-setup.ts.
    globalSetup: ['tests/global-setup.ts'],
    testTimeout: 20_000,
    hookTimeout: 60_000,
  },
});
