import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/*.playwright.ts",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 5"] } },
  ],
  webServer: {
    command: "next build && next start --hostname 127.0.0.1 --port 3100",
    url: "http://127.0.0.1:3100/en",
    reuseExistingServer: !process.env.CI,
    env: {
      AUTH_DISABLED: "true",
      NEXT_PUBLIC_APP_URL: "http://127.0.0.1:3100",
    },
  },
});
