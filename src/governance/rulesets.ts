import type { GovernancePolicy } from "./model";

export type RulesetStage = "minimal" | "full";

type RulesetRule = {
  type: string;
  parameters?: Record<string, unknown>;
};

export type RepositoryRuleset = {
  name: string;
  target: "branch" | "tag";
  enforcement: "active";
  bypass_actors: Array<{
    actor_id: number;
    actor_type: "Integration";
    bypass_mode: "always";
  }>;
  conditions: {
    ref_name: { include: string[]; exclude: string[] };
  };
  rules: RulesetRule[];
};

function bypass(appId: number): RepositoryRuleset["bypass_actors"] {
  if (!Number.isSafeInteger(appId) || appId <= 0) {
    throw new Error("Release App ID must be a positive integer");
  }
  return [
    {
      actor_id: appId,
      actor_type: "Integration",
      bypass_mode: "always",
    },
  ];
}

export function buildBranchRuleset(
  policy: GovernancePolicy,
  appId: number,
  stage: RulesetStage,
): RepositoryRuleset {
  const rules: RulesetRule[] = [
    { type: "deletion" },
    { type: "non_fast_forward" },
  ];
  if (stage === "full") {
    rules.push(
      {
        type: "pull_request",
        parameters: {
          dismiss_stale_reviews_on_push: false,
          require_code_owner_review: false,
          require_last_push_approval: false,
          required_approving_review_count: 0,
          required_review_thread_resolution: true,
        },
      },
      {
        type: "required_status_checks",
        parameters: {
          do_not_enforce_on_create: true,
          strict_required_status_checks_policy: true,
          required_status_checks: policy.requiredChecks.map((context) => ({
            context,
            integration_id: 15368,
          })),
        },
      },
      {
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
      },
    );
  }
  return {
    name: policy.rulesets.branch,
    target: "branch",
    enforcement: "active",
    bypass_actors: bypass(appId),
    conditions: {
      ref_name: { include: ["~DEFAULT_BRANCH"], exclude: [] },
    },
    rules,
  };
}

export function buildTagRuleset(
  policy: GovernancePolicy,
  appId: number,
): RepositoryRuleset {
  return {
    name: policy.rulesets.tag,
    target: "tag",
    enforcement: "active",
    bypass_actors: bypass(appId),
    conditions: {
      ref_name: { include: ["refs/tags/v*"], exclude: [] },
    },
    rules: [
      { type: "creation" },
      { type: "update" },
      { type: "deletion" },
      { type: "non_fast_forward" },
    ],
  };
}
