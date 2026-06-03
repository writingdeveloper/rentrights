import { defaultExclude, defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: { environment: 'node', exclude: [...defaultExclude, '**/e2e/**'] },
  resolve: { alias: { '@': path.resolve(__dirname, '.') } },
});
