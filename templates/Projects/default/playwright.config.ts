import { defineConfig, devices } from "@playwright/test";

const port = process.env.CNP_TEST_PORT ?? "3100";
const baseURL = `http://127.0.0.1:${port}`;
const start = `next start --hostname 127.0.0.1 --port ${port}`;

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/*.playwright.ts",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL,
    trace: "retain-on-failure",
    contextOptions: { reducedMotion: "reduce" },
  },
  webServer: {
    command:
      process.env.CNP_USE_EXISTING_BUILD === "1"
        ? start
        : `next build && ${start}`,
    url: `${baseURL}/en`,
    env: {
      NEXT_PUBLIC_APP_URL: baseURL,
      AUTH_URL: baseURL,
      NEXTAUTH_URL: baseURL,
      AUTH_SECRET: "",
      AUTH_GOOGLE_ID: "",
      AUTH_GOOGLE_SECRET: "",
      AUTH_DISABLED: "true",
    },
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        contextOptions: { reducedMotion: "reduce" },
      },
    },
    {
      name: "mobile",
      use: {
        ...devices["Pixel 5"],
        contextOptions: { reducedMotion: "reduce" },
      },
    },
  ],
});
