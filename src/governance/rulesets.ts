import type { GovernancePolicy } from "./model";

export type RulesetStage = "minimal" | "branch" | "full";

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
    actor_type: "Integration" | "RepositoryRole";
    bypass_mode: "always";
  }>;
  conditions: {
    ref_name: { include: string[]; exclude: string[] };
  };
  rules: RulesetRule[];
};

const REPOSITORY_ADMIN_ROLE_ID = 5;

function releaseAppBypass(appId: number): RepositoryRuleset["bypass_actors"] {
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

function adminBypass(): RepositoryRuleset["bypass_actors"] {
  return [
    {
      actor_id: REPOSITORY_ADMIN_ROLE_ID,
      actor_type: "RepositoryRole",
      bypass_mode: "always",
    },
  ];
}

export function buildBranchSafetyRuleset(
  policy: GovernancePolicy,
): RepositoryRuleset {
  return {
    name: policy.rulesets.branch,
    target: "branch",
    enforcement: "active",
    bypass_actors: [],
    conditions: {
      ref_name: { include: ["~DEFAULT_BRANCH"], exclude: [] },
    },
    rules: [{ type: "deletion" }, { type: "non_fast_forward" }],
  };
}

export function buildBranchContributionRuleset(
  policy: GovernancePolicy,
  appId?: number,
): RepositoryRuleset {
  const bypassActors = policy.rulesets.allowAdminDirectPush
    ? adminBypass()
    : [];
  if (appId !== undefined) bypassActors.push(...releaseAppBypass(appId));
  return {
    name: policy.rulesets.contributions,
    target: "branch",
    enforcement: "active",
    bypass_actors: bypassActors,
    conditions: {
      ref_name: { include: ["~DEFAULT_BRANCH"], exclude: [] },
    },
    rules: [
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
    ],
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
    bypass_actors: releaseAppBypass(appId),
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
