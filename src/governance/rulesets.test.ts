import { describe, expect, test } from "vitest";

import type { GovernancePolicy } from "./model";
import {
  buildBranchContributionRuleset,
  buildBranchSafetyRuleset,
  buildTagRuleset,
} from "./rulesets";

const policy = {
  rulesets: {
    branch: "protect-master",
    contributions: "govern-master-contributions",
    tag: "protect-release-tags",
    allowAdminDirectPush: true,
  },
  requiredChecks: ["validate-cli", "validate-template (bun)"],
  cleanup: { pullRequests: [], branches: [] },
} as unknown as GovernancePolicy;

describe("governance rulesets", () => {
  test("keeps destructive protections separate without bypass", () => {
    const ruleset = buildBranchSafetyRuleset(policy);
    expect(ruleset.conditions.ref_name.include).toEqual(["~DEFAULT_BRANCH"]);
    expect(ruleset.rules.map((rule) => rule.type)).toEqual([
      "deletion",
      "non_fast_forward",
    ]);
    expect(ruleset.bypass_actors).toEqual([]);
  });

  test("allows repository admins to bypass only contribution gates", () => {
    const ruleset = buildBranchContributionRuleset(policy);
    expect(ruleset.name).toBe("govern-master-contributions");
    expect(ruleset.bypass_actors).toEqual([
      {
        actor_id: 5,
        actor_type: "RepositoryRole",
        bypass_mode: "always",
      },
    ]);
    expect(ruleset.rules.map((rule) => rule.type)).not.toContain("deletion");
    expect(ruleset.rules.map((rule) => rule.type)).not.toContain(
      "non_fast_forward",
    );
  });

  test("requires pull requests and exact GitHub Actions checks", () => {
    const ruleset = buildBranchContributionRuleset(policy, 123);
    const checks = ruleset.rules.find(
      (rule) => rule.type === "required_status_checks",
    );
    expect(checks?.parameters?.required_status_checks).toEqual([
      { context: "validate-cli", integration_id: 15368 },
      { context: "validate-template (bun)", integration_id: 15368 },
    ]);
    expect(ruleset.bypass_actors).toEqual([
      {
        actor_id: 5,
        actor_type: "RepositoryRole",
        bypass_mode: "always",
      },
      {
        actor_id: 123,
        actor_type: "Integration",
        bypass_mode: "always",
      },
    ]);
    expect(ruleset.rules).toContainEqual({
      type: "code_scanning",
      parameters: {
        code_scanning_tools: [
          {
            tool: "CodeQL",
            security_alerts_threshold: "high_or_higher",
            alerts_threshold: "errors",
          },
        ],
      },
    });
  });

  test("reserves v-prefixed tags for the release App", () => {
    const ruleset = buildTagRuleset(policy, 123);
    expect(ruleset.conditions.ref_name.include).toEqual(["refs/tags/v*"]);
    expect(ruleset.bypass_actors).toEqual([
      {
        actor_id: 123,
        actor_type: "Integration",
        bypass_mode: "always",
      },
    ]);
    expect(ruleset.rules.map((rule) => rule.type)).toEqual([
      "creation",
      "update",
      "deletion",
      "non_fast_forward",
    ]);
  });

  test("rejects invalid App identifiers", () => {
    expect(() => buildBranchContributionRuleset(policy, 0)).toThrow(
      "positive integer",
    );
    expect(() => buildTagRuleset(policy, 0)).toThrow("positive integer");
  });
});
