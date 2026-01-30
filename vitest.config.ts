import { getViteConfig } from 'astro/config';

export default getViteConfig({
  test: {
    /* Run tests in jsdom environment for React components */
    environment: 'jsdom',

    /* Global imports — no need for import { describe, it, expect } */
    globals: true,

    /* Setup file — global mocks, custom matchers */
    setupFiles: ['./tests/setup.ts'],

    /* Test file patterns */
    include: ['./src/**/*.test.ts', './src/**/*.test.tsx', './tests/**/*.test.ts'],

    /* Exclude E2E from Vitest */
    exclude: ['./e2e/**', './node_modules/**'],

    /* Coverage configuration */
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/lib/**', 'src/hooks/**', 'src/components/**', 'src/pages/api/**', 'src/middleware/**'],
      exclude: [
        'src/components/ui/**' /* Shadcn — not our code */,
        'src/db/database.types.ts' /* Auto-generated */,
        '**/*.d.ts',
        '**/*.test.*',
      ],
      /* Thresholds disabled during initial test development phase */
      // thresholds: {
      //   statements: 60,
      //   branches: 50,
      //   functions: 60,
      //   lines: 60,
      // },
    },

    /* Path aliases — consistent with tsconfig */
    alias: {
      '@/': new URL('./src/', import.meta.url).pathname,
    },
  },
});
