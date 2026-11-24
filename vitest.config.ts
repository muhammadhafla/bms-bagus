import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    pool: 'threads',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: [
        'middleware.ts',
        'lib/api/auth-guard.ts',
        'lib/api/ledger.ts',
        'lib/api/return.ts',
        'lib/api/stockOpname.ts',
        'lib/fetchApi.ts',
        'lib/validation.ts',
        'app/api/**/route.{ts,tsx}',
      ],
      thresholds: {
        'middleware.ts': {
          lines: 80,
          functions: 80,
        },
        'lib/api/auth-guard.ts': {
          lines: 80,
          functions: 80,
        },
      },
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'server',
          environment: 'node',
          setupFiles: ['./vitest.setup.node.ts'],
          include: ['middleware.test.ts', 'lib/api/**/*.test.ts', 'app/api/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'ui',
          environment: 'jsdom',
          setupFiles: ['./vitest.setup.ts'],
          include: ['**/*.test.{ts,tsx}'],
          exclude: [
            'node_modules/**',
            '.next/**',
            'middleware.test.ts',
            'lib/api/**/*.test.ts',
            'app/api/**/*.test.ts',
          ],
        },
      },
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
