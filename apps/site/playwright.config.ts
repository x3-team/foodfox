import { defineConfig, devices } from "@playwright/test";

const port = process.env.PORT || "3000";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: "on-first-retry",
  },
  webServer: {
    command: process.env.CI ? "npm run start" : "npm run dev",
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: { PORT: port },
  },
  projects: [
    { name: "1440", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "1280", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } },
    { name: "768", use: { ...devices["Desktop Chrome"], viewport: { width: 768, height: 900 } } },
    { name: "375", use: { ...devices["Desktop Chrome"], viewport: { width: 375, height: 812 } } },
  ],
});
