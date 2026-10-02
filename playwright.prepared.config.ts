import { defineConfig, devices } from '@playwright/test';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/** Opt-in checks with the owner's ignored prepared data; never run in public CI. */
export default defineConfig({
  testDir: './tests/prepared',
  forbidOnly: true,
  retries: 0,
  workers: 1,
  timeout: 120_000,
  reporter: 'list',
  outputDir: join(tmpdir(), 'boardbot-private-test-results'),
  use: {
    baseURL: 'http://127.0.0.1:4182',
    trace: 'off',
    screenshot: 'off',
    video: 'off',
  },
  projects: [{ name: 'private-chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev -- --port 4182 --strictPort',
    url: 'http://127.0.0.1:4182',
    reuseExistingServer: false,
  },
});
