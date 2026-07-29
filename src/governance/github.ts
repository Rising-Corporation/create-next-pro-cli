import type { GovernancePolicy, GovernanceSnapshot } from "./model";

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

export async function collectGithubSnapshot(
  policy: GovernancePolicy,
  transport: GithubTransport,
): Promise<GovernanceSnapshot> {
  const unavailable: GovernanceSnapshot["unavailable"] = [];
  const repository = record(
    await optional(unavailable, "repository", () =>
      transport.request(`repos/${policy.repository}`),
    ),
  );
  const actions = record(
    await optional(unavailable, "actions.permissions", () =>
      transport.request(`repos/${policy.repository}/actions/permissions`),
    ),
  );
  const workflow = record(
    await optional(unavailable, "actions.workflowPermissions", () =>
      transport.request(
        `repos/${policy.repository}/actions/permissions/workflow`,
      ),
    ),
  );
  const environment = record(
    await optional(unavailable, "environment", () =>
      transport.request(
        `repos/${policy.repository}/environments/${policy.environment.name}`,
      ),
    ),
  );
  const deploymentPolicy = record(environment.deployment_branch_policy);
  const branchPolicies = boolean(deploymentPolicy.custom_branch_policies)
    ? record(
        await optional(unavailable, "environment.allowedBranches", () =>
          transport.request(
            `repos/${policy.repository}/environments/${policy.environment.name}/deployment-branch-policies?per_page=100`,
          ),
        ),
      )
    : {};
  const environmentSecrets = record(
    await optional(unavailable, "release.secretNames", () =>
      transport.request(
        `repos/${policy.repository}/environments/${policy.environment.name}/secrets?per_page=100`,
      ),
    ),
  );
  const environmentVariables = record(
    await optional(unavailable, "release.variableNames", () =>
      transport.request(
        `repos/${policy.repository}/environments/${policy.environment.name}/variables?per_page=100`,
      ),
    ),
  );
  const repositoryVariables = record(
    await optional(unavailable, "release.releaseEnabled", () =>
      transport.request(
        `repos/${policy.repository}/actions/variables?per_page=100`,
      ),
    ),
  );
  const privateReporting = record(
    await optional(unavailable, "security.privateVulnerabilityReporting", () =>
      transport.request(
        `repos/${policy.repository}/private-vulnerability-reporting`,
      ),
    ),
  );
  const securityFixes = record(
    await optional(unavailable, "security.automatedSecurityFixes", () =>
      transport.request(`repos/${policy.repository}/automated-security-fixes`),
    ),
  );
  const codeql = record(
    await optional(unavailable, "security.codeqlState", () =>
      transport.request(
        `repos/${policy.repository}/code-scanning/default-setup`,
      ),
    ),
  );
  const rulesets = await optional(unavailable, "rulesets", () =>
    transport.request(`repos/${policy.repository}/rulesets?per_page=100`),
  );
  const labels = await optional(unavailable, "community.labels", () =>
    transport.request(`repos/${policy.repository}/labels?per_page=100`),
  );
  const [owner] = policy.repository.split("/");
  const installations = record(
    await optional(unavailable, "release.installedAppSlugs", () =>
      transport.request(`orgs/${owner}/installations?per_page=100`),
    ),
  );
  const discussions = record(
    await optional(unavailable, "community.discussionCategories", () =>
      transport.graphql(`query {
        repository(owner: "${owner}", name: "${policy.repository.split("/")[1]}") {
          discussionCategories(first: 100) { nodes { name } }
        }
      }`),
    ),
  );
  const projects = record(
    await optional(unavailable, "projects", () =>
      transport.graphql(`query {
        repository(owner: "${owner}", name: "${policy.repository.split("/")[1]}") {
          projectsV2(first: 1) { totalCount }
        }
      }`),
    ),
  );

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
  const projectData = record(
    record(record(projects.data).repository).projectsV2,
  );

  return {
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
    },
    environment: {
      exists: Boolean(environment.name),
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
      releaseEnabled:
        repositoryVariableEntries.find(
          (item) => item.name === "RELEASE_ENABLED",
        )?.value === "true",
    },
    rulesets: array(rulesets).map((item) => ({
      name: string(record(item).name),
      enforcement: string(record(item).enforcement),
    })),
    projects:
      typeof projectData.totalCount === "number"
        ? { totalCount: projectData.totalCount }
        : undefined,
    unavailable,
  };
}
