import { describe, expect, test } from "vitest";

import type { GovernancePolicy } from "./model";
import { buildBranchRuleset, buildTagRuleset } from "./rulesets";

const policy = {
  rulesets: { branch: "protect-master", tag: "protect-release-tags" },
  requiredChecks: ["validate-cli", "validate-template (bun)"],
} as GovernancePolicy;

describe("governance rulesets", () => {
  test("builds a reversible minimal branch protection", () => {
    const ruleset = buildBranchRuleset(policy, 123, "minimal");
    expect(ruleset.conditions.ref_name.include).toEqual(["~DEFAULT_BRANCH"]);
    expect(ruleset.rules.map((rule) => rule.type)).toEqual([
      "deletion",
      "non_fast_forward",
    ]);
    expect(ruleset.bypass_actors).toEqual([
      expect.objectContaining({ actor_id: 123, actor_type: "Integration" }),
    ]);
  });

  test("requires pull requests and exact GitHub Actions checks", () => {
    const ruleset = buildBranchRuleset(policy, 123, "full");
    const checks = ruleset.rules.find(
      (rule) => rule.type === "required_status_checks",
    );
    expect(checks?.parameters?.required_status_checks).toEqual([
      { context: "validate-cli", integration_id: 15368 },
      { context: "validate-template (bun)", integration_id: 15368 },
    ]);
  });

  test("reserves v-prefixed tags for the release App", () => {
    const ruleset = buildTagRuleset(policy, 123);
    expect(ruleset.conditions.ref_name.include).toEqual(["refs/tags/v*"]);
    expect(ruleset.rules.map((rule) => rule.type)).toEqual([
      "creation",
      "update",
      "deletion",
      "non_fast_forward",
    ]);
  });

  test("rejects invalid App identifiers", () => {
    expect(() => buildBranchRuleset(policy, 0, "full")).toThrow(
      "positive integer",
    );
  });
});
