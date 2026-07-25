import { describe, expect, test } from "vitest";

import {
  evaluateAuditPolicy,
  normalizeAuditReport,
  type AuditManifest,
  type NormalizedAuditReport,
} from "../../scripts/audit-policy.ts";

const npmGraphPackages = [
  "@eslint/config-array",
  "@eslint/eslintrc",
  "brace-expansion",
  "eslint",
  "eslint-config-next",
  "eslint-plugin-import",
  "eslint-plugin-jsx-a11y",
  "eslint-plugin-react",
  "minimatch",
];

const npmGraphPaths = [
  "node_modules/@eslint/config-array",
  "node_modules/@eslint/eslintrc",
  "node_modules/brace-expansion",
  "node_modules/eslint",
  "node_modules/eslint-config-next",
  "node_modules/eslint-plugin-import",
  "node_modules/eslint-plugin-jsx-a11y",
  "node_modules/eslint-plugin-react",
  "node_modules/minimatch",
];

const manifest: AuditManifest = {
  name: "fixture",
  dependencies: { next: "16.2.11" },
  devDependencies: {
    eslint: "9.39.5",
    "eslint-config-next": "16.2.11",
  },
};

function npmReport(): NormalizedAuditReport {
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
    ],
    graphPackages: npmGraphPackages,
    graphPaths: npmGraphPaths,
  };
}

describe("temporary audit policy", () => {
  test.each([
    ["bun", "{}"],
    ["npm", '{"vulnerabilities":{}}'],
    ["pnpm", '{"advisories":{}}'],
  ] as const)("normalizes a clean %s audit report", (manager, output) => {
    expect(normalizeAuditReport(manager, output)).toEqual({
      manager,
      findings: [],
      graphPackages: [],
      graphPaths: [],
    });
  });

  test("accepts only the pinned development dependency graph", () => {
    expect(
      evaluateAuditPolicy(npmReport(), {
        now: new Date("2026-08-08T23:59:59.000Z"),
        manifest,
      }),
    ).toEqual({
      accepted: true,
      allowedAdvisories: ["GHSA-mh99-v99m-4gvg"],
      errors: [],
    });
  });

  test("rejects the exception after its expiration date", () => {
    const decision = evaluateAuditPolicy(npmReport(), {
      now: new Date("2026-08-09T00:00:00.000Z"),
      manifest,
    });
    expect(decision.accepted).toBe(false);
    expect(decision.errors).toContain(
      "The audit exception expired on 2026-08-08.",
    );
  });

  test("rejects an unexpected dependency path", () => {
    const report = npmReport();
    report.graphPaths.push("node_modules/production/brace-expansion");
    const decision = evaluateAuditPolicy(report, {
      now: new Date("2026-07-25T00:00:00.000Z"),
      manifest,
    });
    expect(decision.accepted).toBe(false);
    expect(decision.errors).toContain(
      "The npm advisory dependency graph does not match the approved graph.",
    );
  });

  test("rejects a dependency root that enters production dependencies", () => {
    const decision = evaluateAuditPolicy(npmReport(), {
      now: new Date("2026-07-25T00:00:00.000Z"),
      manifest: {
        ...manifest,
        dependencies: { eslint: "9.39.5" },
      },
    });
    expect(decision.accepted).toBe(false);
    expect(decision.errors).toContain(
      "eslint is not confined to devDependencies.",
    );
  });

  test("rejects invalid audit JSON", () => {
    expect(() => normalizeAuditReport("bun", "not-json")).toThrow(
      "Audit output contains no JSON object.",
    );
    expect(() => normalizeAuditReport("npm", "{broken}")).toThrow(
      "Audit output contains invalid JSON.",
    );
  });

  test("rejects every new advisory", () => {
    const report = npmReport();
    report.findings.push({
      advisoryId: "GHSA-new-advisory",
      packageName: "unexpected-package",
      severity: "critical",
      paths: ["node_modules/unexpected-package"],
      devOnly: true,
    });
    const decision = evaluateAuditPolicy(report, {
      now: new Date("2026-07-25T00:00:00.000Z"),
      manifest,
    });
    expect(decision.accepted).toBe(false);
    expect(decision.errors).toContain(
      "The audit contains an advisory that is not explicitly allowed.",
    );
  });
});
