import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { createLocalGameDataPlugin } from './scripts/localGameData.ts';

export default defineConfig({
  plugins: [react(), createLocalGameDataPlugin(fileURLToPath(new URL('.', import.meta.url)))],
  server: { fs: { deny: [
    '.env', '.env.*', '*.{crt,pem,key,p12,pfx,cer,der}', '.npmrc', '.yarnrc.yml', '**/.git/**',
    '**/local-data/**',
  ] } },
  test: { include: ['src/**/*.test.ts'] },
});
