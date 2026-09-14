import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90000,
  expect: { timeout: 10000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:4321",
    ...devices["Desktop Chrome"],
    // Session cookies and test account credentials must not enter trace artifacts.
    trace: "off",
    screenshot: "only-on-failure",
    video: "off",
  },
});
