import {
  CI_EXCLUDED_PATHS,
  type GovernancePolicy,
  type GovernanceProfile,
  type GovernanceSnapshot,
} from "./model";
import { canonicalRuleset, type RepositoryRuleset } from "./rulesets";

export type GithubTransport = {
  request(endpoint: string): Promise<unknown>;
  graphql(query: string): Promise<unknown>;
};

type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function string(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function boolean(value: unknown): boolean {
  return value === true || record(value).status === "enabled";
}

async function optional(
  unavailable: GovernanceSnapshot["unavailable"],
  path: string,
  task: () => Promise<unknown>,
): Promise<unknown> {
  try {
    return await task();
  } catch (error) {
    unavailable.push({
      path,
      reason: error instanceof Error ? error.message : String(error),
    });
    return undefined;
  }
}

async function collectRulesets(
  policy: GovernancePolicy,
  transport: GithubTransport,
  unavailable: GovernanceSnapshot["unavailable"],
): Promise<RepositoryRuleset[]> {
  const listed = array(
    await optional(unavailable, "rulesets", () =>
      transport.request(`repos/${policy.repository}/rulesets?per_page=100`),
    ),
  );
  const governedNames = new Set([
    policy.rulesets.branch,
    policy.rulesets.contributions,
    policy.rulesets.tag,
  ]);
  const details: RepositoryRuleset[] = [];
  for (const item of listed) {
    const summary = record(item);
    const name = string(summary.name);
    if (!governedNames.has(name)) continue;
    const id = summary.id;
    if (typeof id !== "number") {
      unavailable.push({
        path: `rulesets.${name}`,
        reason: "GitHub returned a ruleset without a numeric identifier",
      });
      continue;
    }
    const detail = await optional(unavailable, `rulesets.${name}`, () =>
      transport.request(`repos/${policy.repository}/rulesets/${id}`),
    );
    if (detail) details.push(canonicalRuleset(record(detail)));
  }
  return details;
}

export async function collectGithubSnapshot(
  policy: GovernancePolicy,
  transport: GithubTransport,
  profile: GovernanceProfile = "admin",
): Promise<GovernanceSnapshot> {
  const unavailable: GovernanceSnapshot["unavailable"] = [];
  const admin = profile === "admin";
  const excludedPaths = admin ? [] : [...CI_EXCLUDED_PATHS];
  const repository = record(
    await optional(unavailable, "repository", () =>
      transport.request(`repos/${policy.repository}`),
    ),
  );
  const actions = admin
    ? record(
        await optional(unavailable, "actions.permissions", () =>
          transport.request(`repos/${policy.repository}/actions/permissions`),
        ),
      )
    : {};
  const workflow = admin
    ? record(
        await optional(unavailable, "actions.workflowPermissions", () =>
          transport.request(
            `repos/${policy.repository}/actions/permissions/workflow`,
          ),
        ),
      )
    : {};
  const forkApproval = admin
    ? record(
        await optional(
          unavailable,
          "actions.forkPullRequestApprovalPolicy",
          () =>
            transport.request(
              `repos/${policy.repository}/actions/permissions/fork-pr-contributor-approval`,
            ),
        ),
      )
    : {};
  const environment = admin
    ? record(
        await optional(unavailable, "environment", () =>
          transport.request(
            `repos/${policy.repository}/environments/${policy.environment.name}`,
          ),
        ),
      )
    : {};
  const deploymentPolicy = record(environment.deployment_branch_policy);
  const branchPolicies =
    admin && boolean(deploymentPolicy.custom_branch_policies)
      ? record(
          await optional(unavailable, "environment.allowedBranches", () =>
            transport.request(
              `repos/${policy.repository}/environments/${policy.environment.name}/deployment-branch-policies?per_page=100`,
            ),
          ),
        )
      : {};
  const environmentSecrets = admin
    ? record(
        await optional(unavailable, "release.secretNames", () =>
          transport.request(
            `repos/${policy.repository}/environments/${policy.environment.name}/secrets?per_page=100`,
          ),
        ),
      )
    : {};
  const environmentVariables = admin
    ? record(
        await optional(unavailable, "release.variableNames", () =>
          transport.request(
            `repos/${policy.repository}/environments/${policy.environment.name}/variables?per_page=100`,
          ),
        ),
      )
    : {};
  const repositoryVariables = admin
    ? record(
        await optional(unavailable, "release.releaseEnabled", () =>
          transport.request(
            `repos/${policy.repository}/actions/variables?per_page=100`,
          ),
        ),
      )
    : {};
  const privateReporting = admin
    ? record(
        await optional(
          unavailable,
          "security.privateVulnerabilityReporting",
          () =>
            transport.request(
              `repos/${policy.repository}/private-vulnerability-reporting`,
            ),
        ),
      )
    : {};
  const securityFixes = admin
    ? record(
        await optional(unavailable, "security.automatedSecurityFixes", () =>
          transport.request(
            `repos/${policy.repository}/automated-security-fixes`,
          ),
        ),
      )
    : {};
  const codeql = admin
    ? record(
        await optional(unavailable, "security.codeqlState", () =>
          transport.request(
            `repos/${policy.repository}/code-scanning/default-setup`,
          ),
        ),
      )
    : {};
  const rulesets = await collectRulesets(policy, transport, unavailable);
  const dependabotAlerts = admin
    ? await optional(unavailable, "dependabot.alerts", () =>
        transport.request(
          `repos/${policy.repository}/dependabot/alerts?state=open&per_page=100`,
        ),
      )
    : [];
  const pullRequests = admin
    ? await optional(unavailable, "dependabot.maintenancePullRequests", () =>
        transport.request(
          `repos/${policy.repository}/pulls?state=open&per_page=100`,
        ),
      )
    : [];
  const labels = await optional(unavailable, "community.labels", () =>
    transport.request(`repos/${policy.repository}/labels?per_page=100`),
  );
  const [owner, repositoryName] = policy.repository.split("/");
  const installations = admin
    ? record(
        await optional(unavailable, "release.installedAppSlugs", () =>
          transport.request(`orgs/${owner}/installations?per_page=100`),
        ),
      )
    : {};
  const discussions = record(
    await optional(unavailable, "community.discussionCategories", () =>
      transport.graphql(`query {
        repository(owner: "${owner}", name: "${repositoryName}") {
          discussionCategories(first: 100) { nodes { name } }
        }
      }`),
    ),
  );
  const projects =
    admin && repository.has_projects !== false
      ? record(
          await optional(unavailable, "projects", () =>
            transport.graphql(`query {
            repository(owner: "${owner}", name: "${repositoryName}") {
              projectsV2(first: 1) { totalCount }
            }
          }`),
          ),
        )
      : {};

  const security = record(repository.security_and_analysis);
  const allowedBranches = boolean(deploymentPolicy.custom_branch_policies)
    ? array(branchPolicies.branch_policies).map((item) =>
        string(record(item).name),
      )
    : boolean(deploymentPolicy.protected_branches)
      ? ["protected"]
      : ["*"];
  const environmentVariableEntries = array(environmentVariables.variables).map(
    record,
  );
  const repositoryVariableEntries = array(repositoryVariables.variables).map(
    record,
  );
  const rawAppId = environmentVariableEntries.find(
    (item) => item.name === policy.release.appIdVariable,
  )?.value;
  const appId =
    typeof rawAppId === "string" && /^\d+$/.test(rawAppId)
      ? Number(rawAppId)
      : undefined;
  const projectData = record(
    record(record(projects.data).repository).projectsV2,
  );

  return {
    profile,
    excludedPaths,
    repository: string(repository.full_name),
    repositorySettings: {
      defaultBranch: string(repository.default_branch),
      visibility:
        string(repository.visibility) === "private" ? "private" : "public",
      allowMergeCommit: boolean(repository.allow_merge_commit),
      allowSquashMerge: boolean(repository.allow_squash_merge),
      allowRebaseMerge: boolean(repository.allow_rebase_merge),
      allowAutoMerge: boolean(repository.allow_auto_merge),
      deleteBranchOnMerge: boolean(repository.delete_branch_on_merge),
      hasIssues: boolean(repository.has_issues),
      hasDiscussions: boolean(repository.has_discussions),
      hasWiki: boolean(repository.has_wiki),
    },
    actions: {
      enabled: boolean(actions.enabled),
      allowedActions:
        string(actions.allowed_actions) === "selected"
          ? "selected"
          : string(actions.allowed_actions) === "local_only"
            ? "local_only"
            : "all",
      shaPinningRequired: boolean(actions.sha_pinning_required),
      defaultWorkflowPermissions:
        string(workflow.default_workflow_permissions) === "read"
          ? "read"
          : "write",
      canApprovePullRequestReviews: boolean(
        workflow.can_approve_pull_request_reviews,
      ),
      forkPullRequestApprovalPolicy:
        string(forkApproval.approval_policy) === "all_external_contributors"
          ? "all_external_contributors"
          : string(forkApproval.approval_policy) ===
              "first_time_contributors_new_to_github"
            ? "first_time_contributors_new_to_github"
            : "first_time_contributors",
    },
    environment: {
      exists: Boolean(environment.name),
      canAdminsBypass:
        typeof environment.can_admins_bypass === "boolean"
          ? environment.can_admins_bypass
          : undefined,
      allowedBranches,
      secretNames: array(environmentSecrets.secrets).map((item) =>
        string(record(item).name),
      ),
    },
    security: {
      privateVulnerabilityReporting: boolean(privateReporting.enabled),
      automatedSecurityFixes: boolean(securityFixes.enabled),
      secretScanning: boolean(security.secret_scanning),
      pushProtection: boolean(security.secret_scanning_push_protection),
      codeqlState:
        string(codeql.state) === "configured" ? "configured" : "not-configured",
    },
    community: {
      labels: array(labels).map((item) => string(record(item).name)),
      discussionCategories: array(
        record(record(record(discussions.data).repository).discussionCategories)
          .nodes,
      ).map((item) => string(record(item).name)),
    },
    release: {
      installedAppSlugs: array(installations.installations).map((item) =>
        string(record(item).app_slug),
      ),
      variableNames: environmentVariableEntries.map((item) =>
        string(item.name),
      ),
      secretNames: array(environmentSecrets.secrets).map((item) =>
        string(record(item).name),
      ),
      appId,
      releaseEnabled:
        repositoryVariableEntries.find(
          (item) => item.name === "RELEASE_ENABLED",
        )?.value === "true",
    },
    rulesets,
    dependabot: {
      openAlerts: array(dependabotAlerts).map((item) => {
        const alert = record(item);
        const dependency = record(alert.dependency);
        const vulnerability = record(alert.security_vulnerability);
        return {
          number: typeof alert.number === "number" ? alert.number : 0,
          dependency: string(record(dependency.package).name),
          manifestPath: string(dependency.manifest_path),
          vulnerableRange: string(vulnerability.vulnerable_version_range),
        };
      }),
      openPullRequests: array(pullRequests)
        .map(record)
        .filter(
          (pullRequest) => record(pullRequest.user).login === "dependabot[bot]",
        )
        .map((pullRequest) =>
          typeof pullRequest.number === "number" ? pullRequest.number : 0,
        ),
    },
    projects: admin
      ? repository.has_projects === false
        ? { enabled: false }
        : typeof projectData.totalCount === "number"
          ? { enabled: true, totalCount: projectData.totalCount }
          : undefined
      : undefined,
    unavailable,
  };
}
