import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e/pages",
  fullyParallel: false,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4174/nocte/",
    trace: "retain-on-failure",
    ...devices["Desktop Chrome"],
  },
  webServer: {
    command: "pnpm build:pages && node e2e/pages-server.mjs",
    url: "http://127.0.0.1:4174/nocte/",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
