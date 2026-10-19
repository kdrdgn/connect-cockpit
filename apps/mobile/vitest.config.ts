import { defineConfig } from 'vitest/config';

// Pure TypeScript only (feed building, wording). Screens are checked by hand on the phone.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    passWithNoTests: true,
  },
});
