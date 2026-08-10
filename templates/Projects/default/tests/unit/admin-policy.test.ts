import { describe, expect, test } from "vitest";

import {
  isAdminEmailAllowed,
  parseAdminEmailAllowlist,
} from "../../src/lib/auth/admin-policy";

describe("administrator email policy", () => {
  test("normalizes and deduplicates a configured allowlist", () => {
    const policy = parseAdminEmailAllowlist(
      " Admin@Example.com,maintainer@example.com,admin@example.com ",
    );

    expect(policy.status).toBe("configured");
    expect([...policy.emails]).toEqual([
      "admin@example.com",
      "maintainer@example.com",
    ]);
    expect(isAdminEmailAllowed("ADMIN@example.com", "admin@example.com")).toBe(
      true,
    );
  });

  test.each([undefined, "", "   "])(
    "denies access when the allowlist is missing: %j",
    (value) => {
      expect(parseAdminEmailAllowlist(value).status).toBe("missing");
      expect(isAdminEmailAllowed("admin@example.com", value)).toBe(false);
    },
  );

  test.each([
    "admin@example.com,",
    "admin@example.com,,maintainer@example.com",
    "admin.example.com",
    "@example.com",
    "admin@",
    "admin@@example.com",
    "admin @example.com",
    "admin@example.com\u0000",
  ])("fails closed for an invalid allowlist: %j", (value) => {
    expect(parseAdminEmailAllowlist(value).status).toBe("invalid");
    expect(isAdminEmailAllowed("admin@example.com", value)).toBe(false);
  });

  test.each([undefined, null, "", "not-an-email"])(
    "denies an invalid session email: %j",
    (email) => {
      expect(isAdminEmailAllowed(email, "admin@example.com")).toBe(false);
    },
  );
});
