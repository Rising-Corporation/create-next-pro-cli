import { describe, expect, test } from "vitest";
import { createContentSecurityPolicy } from "@/lib/security/csp";

describe("Content Security Policy", () => {
  test("allows the stable inline scripts required by static Next.js pages", () => {
    const csp = createContentSecurityPolicy(false);

    expect(csp).toContain("script-src 'self' 'unsafe-inline'");
    expect(csp).not.toContain("'unsafe-eval'");
    expect(csp).not.toContain("'nonce-");
  });

  test("allows eval only for the Next.js development runtime", () => {
    const csp = createContentSecurityPolicy(true);

    expect(csp).toContain("script-src 'self' 'unsafe-inline' 'unsafe-eval'");
    expect(csp).not.toContain("'nonce-");
  });
});
