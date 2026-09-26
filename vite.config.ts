import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: '/ogrenme-ritmi/',
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text'],
      include: ['src/domain.ts'],
      thresholds: { lines: 90, functions: 90, branches: 85, statements: 90 },
    },
  },
});
