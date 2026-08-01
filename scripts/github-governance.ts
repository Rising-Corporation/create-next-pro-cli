import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import process from "node:process";

import {
  collectGithubSnapshot,
  type GithubTransport,
} from "../src/governance/github";
import {
  assertGovernancePolicy,
  compareGovernance,
  type GovernancePolicy,
  type GovernanceProfile,
  type GovernanceResult,
} from "../src/governance/model";
import {
  buildBranchContributionRuleset,
  buildBranchSafetyRuleset,
  buildTagRuleset,
  type RepositoryRuleset,
  type RulesetStage,
} from "../src/governance/rulesets";

const POLICY_PATH = ".github/governance/policy.json";

function run(command: string, args: string[], input?: string): string {
  return execFileSync(command, args, {
    encoding: "utf8",
    input,
    stdio: [input === undefined ? "ignore" : "pipe", "pipe", "pipe"],
  }).trim();
}

function request(endpoint: string): unknown {
  const output = run("gh", ["api", endpoint]);
  return output ? (JSON.parse(output) as unknown) : {};
}

function graphql(query: string): unknown {
  return JSON.parse(
    run("gh", ["api", "graphql", "-f", `query=${query}`]),
  ) as unknown;
}

function mutate(method: string, endpoint: string, body?: unknown): void {
  const args = ["api", endpoint, "--method", method];
  if (body !== undefined) args.push("--input", "-");
  run("gh", args, body === undefined ? undefined : JSON.stringify(body));
}

function readPolicy(): GovernancePolicy {
  return assertGovernancePolicy(
    JSON.parse(readFileSync(POLICY_PATH, "utf8")) as unknown,
  );
}

function hasArgument(name: string): boolean {
  return process.argv.slice(3).includes(name);
}

function argumentValue(name: string): string | undefined {
  const args = process.argv.slice(3);
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function governanceProfile(): GovernanceProfile {
  const profile = argumentValue("--profile") ?? "admin";
  if (profile !== "ci" && profile !== "admin") {
    throw new Error("--profile must be ci or admin");
  }
  return profile;
}

function print(result: GovernanceResult, json: boolean): void {
  if (json) {
    process.stdout.write(`${JSON.stringify(result)}\n`);
    return;
  }
  process.stdout.write(
    `${result.status.toUpperCase()}: ${result.summary.compliant} compliant, ${result.summary.drift} drift, ${result.summary.blocked} blocked, ${result.summary.unsupported} unsupported.\n`,
  );
  for (const finding of result.findings.filter(
    (candidate) => candidate.status !== "compliant",
  )) {
    process.stdout.write(
      `${finding.status.toUpperCase()} ${finding.path}: ${finding.reason ?? `expected ${JSON.stringify(finding.expected)}, received ${JSON.stringify(finding.actual)}`}\n`,
    );
  }
}

function assertApplyPreconditions(policy: GovernancePolicy): void {
  if (process.env.CI) throw new Error("github:apply is disabled in CI");
  if (argumentValue("--confirm") !== policy.repository) {
    throw new Error(`github:apply requires --confirm ${policy.repository}`);
  }
  if (run("git", ["status", "--porcelain"])) {
    throw new Error("github:apply requires a clean worktree");
  }
  const current = JSON.parse(
    run("gh", ["repo", "view", "--json", "nameWithOwner,isFork"]),
  ) as { nameWithOwner: string; isFork: boolean };
  if (current.nameWithOwner !== policy.repository || current.isFork) {
    throw new Error("github:apply refuses a different repository or a fork");
  }
  const repository = request(`repos/${policy.repository}`) as {
    permissions?: { admin?: boolean };
  };
  if (!repository.permissions?.admin) {
    throw new Error(
      "github:apply requires repository administration permission",
    );
  }
}

function planProjectsSetting(policy: GovernancePolicy): boolean {
  const repository = request(`repos/${policy.repository}`) as {
    has_projects?: boolean;
  };
  if (!repository.has_projects) return false;
  const [owner, name] = policy.repository.split("/");
  const response = graphql(`query {
    repository(owner: "${owner}", name: "${name}") {
      projectsV2(first: 1) { totalCount }
    }
  }`) as {
    data?: { repository?: { projectsV2?: { totalCount?: number } } };
  };
  const totalCount = response.data?.repository?.projectsV2?.totalCount;
  if (typeof totalCount !== "number") {
    throw new Error("github:apply could not determine the Projects v2 state");
  }
  return policy.projectsPolicy === "disable-if-empty" && totalCount === 0;
}

function applyRepositorySettings(
  policy: GovernancePolicy,
  disableProjects: boolean,
): void {
  mutate("PATCH", `repos/${policy.repository}`, {
    allow_merge_commit: policy.repositorySettings.allowMergeCommit,
    allow_squash_merge: policy.repositorySettings.allowSquashMerge,
    allow_rebase_merge: policy.repositorySettings.allowRebaseMerge,
    allow_auto_merge: policy.repositorySettings.allowAutoMerge,
    delete_branch_on_merge: policy.repositorySettings.deleteBranchOnMerge,
    has_issues: policy.repositorySettings.hasIssues,
    has_discussions: policy.repositorySettings.hasDiscussions,
    has_wiki: policy.repositorySettings.hasWiki,
    ...(disableProjects ? { has_projects: false } : {}),
    squash_merge_commit_title: "PR_TITLE",
    squash_merge_commit_message: "PR_BODY",
  });
  mutate("PUT", `repos/${policy.repository}/actions/permissions`, {
    enabled: true,
    allowed_actions: "selected",
    sha_pinning_required: true,
  });
  mutate(
    "PUT",
    `repos/${policy.repository}/actions/permissions/selected-actions`,
    {
      github_owned_allowed: true,
      verified_allowed: false,
      patterns_allowed: ["oven-sh/setup-bun@*", "pnpm/action-setup@*"],
    },
  );
  mutate("PUT", `repos/${policy.repository}/actions/permissions/workflow`, {
    default_workflow_permissions: "read",
    can_approve_pull_request_reviews: false,
  });
  mutate(
    "PUT",
    `repos/${policy.repository}/actions/permissions/fork-pr-contributor-approval`,
    {
      approval_policy: policy.actions.forkPullRequestApprovalPolicy,
    },
  );
}

function applySecurity(policy: GovernancePolicy): void {
  mutate("PUT", `repos/${policy.repository}/private-vulnerability-reporting`);
  mutate("PUT", `repos/${policy.repository}/automated-security-fixes`);
  mutate("PATCH", `repos/${policy.repository}`, {
    security_and_analysis: {
      secret_scanning: { status: "enabled" },
      secret_scanning_push_protection: { status: "enabled" },
    },
  });
  mutate("PATCH", `repos/${policy.repository}/code-scanning/default-setup`, {
    state: "configured",
    languages: ["javascript-typescript"],
    query_suite: "default",
  });
}

function applyLabels(policy: GovernancePolicy): void {
  const colors: Record<string, string> = {
    "breaking-change": "b60205",
    ci: "1d76db",
    dependencies: "0366d6",
    "github-actions": "2088ff",
    "needs-triage": "d4c5f9",
    release: "5319e7",
    security: "b60205",
  };
  const existing = (
    request(`repos/${policy.repository}/labels?per_page=100`) as Array<{
      name: string;
    }>
  ).map((label) => label.name);
  for (const name of policy.community.requiredLabels) {
    if (!existing.includes(name)) {
      mutate("POST", `repos/${policy.repository}/labels`, {
        name,
        color: colors[name] ?? "ededed",
      });
    }
  }
}

function applyEnvironment(policy: GovernancePolicy): void {
  mutate(
    "PUT",
    `repos/${policy.repository}/environments/${policy.environment.name}`,
    {
      can_admins_bypass: policy.environment.canAdminsBypass,
      reviewers: [],
      wait_timer: 0,
      deployment_branch_policy: {
        protected_branches: false,
        custom_branch_policies: true,
      },
    },
  );
  const endpoint = `repos/${policy.repository}/environments/${policy.environment.name}/deployment-branch-policies`;
  let policies: Array<{ name: string }>;
  try {
    const current = request(`${endpoint}?per_page=100`) as {
      branch_policies?: Array<{ name: string }>;
    };
    policies = current.branch_policies ?? [];
  } catch {
    policies = [];
  }
  if (
    !policies.some((candidate) => candidate.name === policy.environment.branch)
  ) {
    mutate("POST", endpoint, {
      name: policy.environment.branch,
      type: "branch",
    });
  }
}

function upsertRuleset(
  policy: GovernancePolicy,
  ruleset: RepositoryRuleset,
): void {
  const existing = request(
    `repos/${policy.repository}/rulesets?per_page=100`,
  ) as Array<{
    id: number;
    name: string;
  }>;
  const match = existing.find((candidate) => candidate.name === ruleset.name);
  mutate(
    match ? "PUT" : "POST",
    match
      ? `repos/${policy.repository}/rulesets/${match.id}`
      : `repos/${policy.repository}/rulesets`,
    ruleset,
  );
}

function applyRulesets(policy: GovernancePolicy, stage: RulesetStage): void {
  const variables = request(
    `repos/${policy.repository}/environments/${policy.environment.name}/variables?per_page=100`,
  ) as { variables?: Array<{ name: string; value: string }> };
  const rawAppId = variables.variables?.find(
    (variable) => variable.name === policy.release.appIdVariable,
  )?.value;
  const appId = rawAppId ? Number(rawAppId) : undefined;
  if (appId !== undefined && (!Number.isSafeInteger(appId) || appId <= 0)) {
    throw new Error(
      `${policy.release.appIdVariable} must identify a valid installed release App`,
    );
  }
  if (appId !== undefined) {
    const [owner] = policy.repository.split("/");
    const installations = request(
      `orgs/${owner}/installations?per_page=100`,
    ) as {
      installations?: Array<{ app_id?: number; app_slug?: string }>;
    };
    const installation = installations.installations?.find(
      (candidate) => candidate.app_slug === policy.release.appSlug,
    );
    if (!installation || installation.app_id !== appId) {
      throw new Error(
        `${policy.release.appIdVariable} does not match the installed ${policy.release.appSlug} GitHub App`,
      );
    }
  }
  upsertRuleset(policy, buildBranchSafetyRuleset(policy));
  if (stage === "branch" || stage === "full") {
    upsertRuleset(policy, buildBranchContributionRuleset(policy, appId));
  }
  if (stage === "full") {
    if (!appId) {
      throw new Error(
        `Full rulesets require ${policy.release.appIdVariable} for release tags`,
      );
    }
    upsertRuleset(policy, buildTagRuleset(policy, appId));
  }
}

function applyCleanup(policy: GovernancePolicy): void {
  if (
    argumentValue("--confirm-cleanup") !==
    "close-pr-9-and-delete-obsolete-branches"
  ) {
    throw new Error(
      "cleanup requires --confirm-cleanup close-pr-9-and-delete-obsolete-branches",
    );
  }
  for (const branch of policy.cleanup.branches) {
    const current = request(
      `repos/${policy.repository}/branches/${encodeURIComponent(branch.name)}`,
    ) as { commit?: { sha?: string } };
    if (current.commit?.sha !== branch.sha) {
      throw new Error(
        `cleanup refuses ${branch.name}: expected ${branch.sha}, received ${current.commit?.sha ?? "missing"}`,
      );
    }
  }
  for (const pullRequest of policy.cleanup.pullRequests) {
    const current = request(
      `repos/${policy.repository}/pulls/${pullRequest}`,
    ) as { state?: string };
    if (current.state === "open") {
      mutate(
        "POST",
        `repos/${policy.repository}/issues/${pullRequest}/comments`,
        {
          body: "Closing this historical pull request because its implementation has been superseded by the tested commands and protected trunk-based workflow on master.",
        },
      );
      mutate("PATCH", `repos/${policy.repository}/pulls/${pullRequest}`, {
        state: "closed",
      });
    }
  }
  for (const branch of policy.cleanup.branches) {
    mutate(
      "DELETE",
      `repos/${policy.repository}/git/refs/heads/${branch.name}`,
    );
  }
}

async function inspect(
  policy: GovernancePolicy,
  profile: GovernanceProfile,
): Promise<GovernanceResult> {
  const transport: GithubTransport = {
    request: async (endpoint) => request(endpoint),
    graphql: async (query) => graphql(query),
  };
  return compareGovernance(
    policy,
    await collectGithubSnapshot(policy, transport, profile),
  );
}

async function main(): Promise<void> {
  const command = process.argv[2] ?? "check";
  const json = hasArgument("--json");
  const profile = governanceProfile();
  const policy = readPolicy();
  if (command === "apply") {
    if (profile !== "admin") {
      throw new Error("github:apply requires --profile admin");
    }
    assertApplyPreconditions(policy);
    const disableProjects = planProjectsSetting(policy);
    applyRepositorySettings(policy, disableProjects);
    applySecurity(policy);
    applyLabels(policy);
    applyEnvironment(policy);
    const stage = argumentValue("--stage") ?? "settings";
    if (
      stage !== "settings" &&
      stage !== "minimal" &&
      stage !== "branch" &&
      stage !== "full"
    ) {
      throw new Error("--stage must be settings, minimal, branch, or full");
    }
    if (stage === "minimal" || stage === "branch" || stage === "full") {
      applyRulesets(policy, stage);
    }
    if (hasArgument("--include-cleanup")) applyCleanup(policy);
  } else if (command !== "check" && command !== "plan") {
    throw new Error(`Unknown governance command: ${command}`);
  }

  const result = await inspect(policy, profile);
  print(result, json);
  if (command === "check") {
    process.exitCode =
      result.status === "compliant" ? 0 : result.status === "drift" ? 1 : 2;
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 2;
});
