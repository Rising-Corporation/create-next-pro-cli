import { describe, expect, test } from "vitest";

import {
  evaluateAuditPolicy,
  normalizeAuditReport,
  type NormalizedAuditReport,
} from "../../scripts/audit-policy.ts";

function reportWithFindings(): NormalizedAuditReport {
  return {
    manager: "npm",
    findings: [
      {
        advisoryId: "GHSA-mh99-v99m-4gvg",
        packageName: "brace-expansion",
        severity: "high",
        paths: ["node_modules/brace-expansion"],
        devOnly: null,
      },
      {
        advisoryId: "GHSA-new-advisory",
        packageName: "unexpected-package",
        severity: "critical",
        paths: ["node_modules/unexpected-package"],
        devOnly: true,
      },
    ],
    graphPackages: ["brace-expansion", "unexpected-package"],
    graphPaths: [
      "node_modules/brace-expansion",
      "node_modules/unexpected-package",
    ],
  };
}

describe("audit policy", () => {
  test.each([
    ["bun", "{}"],
    ["npm", '{"vulnerabilities":{}}'],
    ["pnpm", '{"advisories":{}}'],
  ] as const)("normalizes a clean %s audit report", (manager, output) => {
    const report = normalizeAuditReport(manager, output);
    expect(report).toEqual({
      manager,
      findings: [],
      graphPackages: [],
      graphPaths: [],
    });
    expect(evaluateAuditPolicy(report)).toEqual({
      accepted: true,
      allowedAdvisories: [],
      errors: [],
    });
  });

  test("rejects every advisory without a temporary exception", () => {
    expect(evaluateAuditPolicy(reportWithFindings())).toEqual({
      accepted: false,
      allowedAdvisories: [],
      errors: [
        "GHSA-mh99-v99m-4gvg affects brace-expansion (high).",
        "GHSA-new-advisory affects unexpected-package (critical).",
      ],
    });
  });

  test("rejects invalid audit JSON", () => {
    expect(() => normalizeAuditReport("bun", "not-json")).toThrow(
      "Audit output contains no JSON object.",
    );
    expect(() => normalizeAuditReport("npm", "{broken}")).toThrow(
      "Audit output contains invalid JSON.",
    );
  });

  test("normalizes Bun advisory identifiers and severities", () => {
    const report = normalizeAuditReport(
      "bun",
      JSON.stringify({
        nanoid: [
          {
            url: "https://github.com/advisories/GHSA-2v37-7h3g-55p8",
            severity: "high",
          },
        ],
      }),
    );
    expect(report.findings).toEqual([
      {
        advisoryId: "GHSA-2v37-7h3g-55p8",
        packageName: "nanoid",
        severity: "high",
        paths: [],
        devOnly: null,
      },
    ]);
    expect(evaluateAuditPolicy(report).accepted).toBe(false);
  });
});
