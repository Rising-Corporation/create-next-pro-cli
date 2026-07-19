import { defineConfig, devices } from "@playwright/test";

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
    baseURL: "http://127.0.0.1:3100",
    trace: "retain-on-failure",
    contextOptions: { reducedMotion: "reduce" },
  },
  webServer: {
    command: "next build && next start --hostname 127.0.0.1 --port 3100",
    url: "http://127.0.0.1:3100/en",
    env: {
      NEXT_PUBLIC_APP_URL: "http://127.0.0.1:3100",
      AUTH_URL: "http://127.0.0.1:3100",
      NEXTAUTH_URL: "http://127.0.0.1:3100",
      AUTH_SECRET: "",
      AUTH_GOOGLE_ID: "",
      AUTH_GOOGLE_SECRET: "",
      AUTH_DISABLED: "true",
    },
    reuseExistingServer: !process.env.CI,
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
