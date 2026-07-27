import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.e2e.ts",
  fullyParallel: false,
  retries: 1,
  workers: 1,
  reporter: "line",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "https://patronhill.ru",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
