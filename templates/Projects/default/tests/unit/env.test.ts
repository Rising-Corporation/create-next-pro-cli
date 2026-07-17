import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { getAuthEnv, getPublicUrl } from "../../src/env";

const envKeys = [
  "AUTH_SECRET",
  "NEXTAUTH_SECRET",
  "AUTH_GOOGLE_ID",
  "GOOGLE_CLIENT_ID",
  "AUTH_GOOGLE_SECRET",
  "AUTH_DISABLED",
  "GOOGLE_CLIENT_SECRET",
  "NEXT_PUBLIC_APP_URL",
  "PROJECT_PRODUCTION_URL",
  "PORT",
] as const;

const originalEnv = new Map<string, string | undefined>();

beforeEach(() => {
  for (const key of envKeys) {
    originalEnv.set(key, process.env[key]);
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of envKeys) {
    const value = originalEnv.get(key);
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
  originalEnv.clear();
});

describe("environment helpers", () => {
  test("disables authentication when all auth values are missing", () => {
    expect(getAuthEnv()).toBeNull();
  });

  test("rejects partial authentication configuration", () => {
    process.env.AUTH_SECRET = "secret";
    expect(() => getAuthEnv()).toThrow("Incomplete Auth.js configuration");
  });

  test("uses Auth.js env aliases for generated templates", () => {
    process.env.NEXTAUTH_SECRET = "secret";
    process.env.GOOGLE_CLIENT_ID = "google-id";
    process.env.GOOGLE_CLIENT_SECRET = "google-secret";

    expect(getAuthEnv()).toEqual({
      secret: "secret",
      googleClientId: "google-id",
      googleClientSecret: "google-secret",
    });
  });

  test("builds a local public URL when no deployment URL is configured", () => {
    process.env.PORT = "3100";

    expect(getPublicUrl()).toBe("http://localhost:3100");
  });

  test("normalizes host-only public URLs to https", () => {
    process.env.PROJECT_PRODUCTION_URL = "example.com";

    expect(getPublicUrl()).toBe("https://example.com");
  });

  test("rejects invalid public URLs", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://[invalid";
    expect(() => getPublicUrl()).toThrow();
  });
});
