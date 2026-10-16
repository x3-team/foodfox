import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";
const username = process.env.PLAYWRIGHT_BASIC_USER;
const password = process.env.PLAYWRIGHT_BASIC_PASSWORD;

export default defineConfig({
  testDir: "./e2e",
  timeout: 180_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  use: {
    baseURL,
    httpCredentials:
      username && password ? { username, password } : undefined,
    ...devices["Desktop Chrome"],
  },
});
