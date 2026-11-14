import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    root: './',
    include: ['src/**/*.spec.ts'],
    environment: 'node',
    // Database-backed integration specs reach Postgres over TCP.
    testTimeout: 30000,
  },
  plugins: [
    swc.vite({
      module: { type: 'es6' },
    }),
  ],
});
