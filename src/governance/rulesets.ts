import type { GovernancePolicy } from "./model";

export type RulesetStage = "minimal" | "branch" | "full";

type RulesetRule = {
  type: string;
  parameters?: Record<string, unknown>;
};

export type RepositoryRuleset = {
  name: string;
  target: string;
  enforcement: string;
  bypass_actors: Array<{
    actor_id: number;
    actor_type: string;
    bypass_mode: string;
  }>;
  conditions: {
    ref_name: { include: string[]; exclude: string[] };
  };
  rules: RulesetRule[];
};

type UnknownRuleset = Partial<RepositoryRuleset> & {
  bypass_actors?: Array<Record<string, unknown>>;
  conditions?: { ref_name?: { include?: unknown; exclude?: unknown } };
  rules?: Array<{ type?: unknown; parameters?: Record<string, unknown> }>;
};

const REPOSITORY_ADMIN_ROLE_ID = 5;

function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string").sort()
    : [];
}

function canonicalParameters(
  type: string,
  parameters: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!parameters) return undefined;
  if (type === "pull_request") {
    return {
      dismiss_stale_reviews_on_push:
        parameters.dismiss_stale_reviews_on_push === true,
      require_code_owner_review: parameters.require_code_owner_review === true,
      require_last_push_approval:
        parameters.require_last_push_approval === true,
      required_approving_review_count:
        typeof parameters.required_approving_review_count === "number"
          ? parameters.required_approving_review_count
          : 0,
      required_review_thread_resolution:
        parameters.required_review_thread_resolution === true,
    };
  }
  if (type === "required_status_checks") {
    const checks = Array.isArray(parameters.required_status_checks)
      ? parameters.required_status_checks
          .map((value) => {
            const check = value as Record<string, unknown>;
            return {
              context: typeof check.context === "string" ? check.context : "",
              integration_id:
                typeof check.integration_id === "number"
                  ? check.integration_id
                  : null,
            };
          })
          .sort((left, right) => left.context.localeCompare(right.context))
      : [];
    return {
      do_not_enforce_on_create: parameters.do_not_enforce_on_create === true,
      strict_required_status_checks_policy:
        parameters.strict_required_status_checks_policy === true,
      required_status_checks: checks,
    };
  }
  if (type === "code_scanning") {
    const tools = Array.isArray(parameters.code_scanning_tools)
      ? parameters.code_scanning_tools
          .map((value) => {
            const tool = value as Record<string, unknown>;
            return {
              tool: typeof tool.tool === "string" ? tool.tool : "",
              security_alerts_threshold:
                typeof tool.security_alerts_threshold === "string"
                  ? tool.security_alerts_threshold
                  : "",
              alerts_threshold:
                typeof tool.alerts_threshold === "string"
                  ? tool.alerts_threshold
                  : "",
            };
          })
          .sort((left, right) => left.tool.localeCompare(right.tool))
      : [];
    return { code_scanning_tools: tools };
  }
  return parameters;
}

/** Normalizes only the ruleset fields governed by this repository. */
export function canonicalRuleset(value: UnknownRuleset): RepositoryRuleset {
  return {
    name: typeof value.name === "string" ? value.name : "",
    target: typeof value.target === "string" ? value.target : "",
    enforcement: typeof value.enforcement === "string" ? value.enforcement : "",
    bypass_actors: (value.bypass_actors ?? [])
      .map((actor) => ({
        actor_id: typeof actor.actor_id === "number" ? actor.actor_id : 0,
        actor_type:
          typeof actor.actor_type === "string" ? actor.actor_type : "",
        bypass_mode:
          typeof actor.bypass_mode === "string" ? actor.bypass_mode : "",
      }))
      .sort((left, right) =>
        `${left.actor_type}:${left.actor_id}`.localeCompare(
          `${right.actor_type}:${right.actor_id}`,
        ),
      ),
    conditions: {
      ref_name: {
        include: strings(value.conditions?.ref_name?.include),
        exclude: strings(value.conditions?.ref_name?.exclude),
      },
    },
    rules: (value.rules ?? [])
      .map((rule) => {
        const type = typeof rule.type === "string" ? rule.type : "";
        const parameters = canonicalParameters(type, rule.parameters);
        return parameters ? { type, parameters } : { type };
      })
      .sort((left, right) => left.type.localeCompare(right.type)),
  };
}

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
