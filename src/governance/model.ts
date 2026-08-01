import {
  buildBranchContributionRuleset,
  buildBranchSafetyRuleset,
  buildTagRuleset,
  canonicalRuleset,
  type RepositoryRuleset,
} from "./rulesets";

export type GovernanceProfile = "ci" | "admin";

export type GovernanceStatus =
  "compliant" | "drift" | "blocked" | "unsupported";

export type GovernanceFinding = {
  path: string;
  status: GovernanceStatus;
  expected?: unknown;
  actual?: unknown;
  reason?: string;
};

export const CI_EXCLUDED_PATHS = [
  "actions",
  "dependabot",
  "environment",
  "projects",
  "release",
  "security",
  "rulesets.releaseAppIdentity",
] as const;

export type GovernancePolicy = {
  schemaVersion: 2;
  repository: string;
  repositorySettings: {
    defaultBranch: string;
    visibility: "public" | "private";
    allowMergeCommit: boolean;
    allowSquashMerge: boolean;
    allowRebaseMerge: boolean;
    allowAutoMerge: boolean;
    deleteBranchOnMerge: boolean;
    hasIssues: boolean;
    hasDiscussions: boolean;
    hasWiki: boolean;
  };
  actions: {
    enabled: boolean;
    allowedActions: "all" | "local_only" | "selected";
    shaPinningRequired: boolean;
    defaultWorkflowPermissions: "read" | "write";
    canApprovePullRequestReviews: boolean;
    forkPullRequestApprovalPolicy:
      | "first_time_contributors"
      | "first_time_contributors_new_to_github"
      | "all_external_contributors";
  };
  environment: {
    name: string;
    branch: string;
    canAdminsBypass: boolean;
  };
  security: {
    privateVulnerabilityReporting: boolean;
    automatedSecurityFixes: boolean;
    secretScanning: boolean;
    pushProtection: boolean;
    codeqlState: "configured" | "not-configured";
  };
  community: {
    requiredLabels: string[];
    requiredDiscussionCategories: string[];
  };
  release: {
    appSlug: string;
    appIdVariable: string;
    privateKeySecret: string;
    forbiddenSecrets: string[];
    releaseEnabled: boolean;
  };
  rulesets: {
    branch: string;
    contributions: string;
    tag: string;
    allowAdminDirectPush: boolean;
  };
  requiredChecks: string[];
  dependabot: {
    inaccurateAlerts: Array<{
      number: number;
      dependency: string;
      manifestPath: string;
      vulnerableRange: string;
      resolvedVersion: string;
    }>;
    maintenancePullRequests: number[];
  };
  cleanup: {
    pullRequests: number[];
    branches: Array<{ name: string; sha: string }>;
  };
  projectsPolicy: "disable-if-empty";
};

export type GovernanceSnapshot = {
  profile: GovernanceProfile;
  excludedPaths: string[];
  repository: string;
  repositorySettings: GovernancePolicy["repositorySettings"];
  actions: GovernancePolicy["actions"];
  environment: {
    exists: boolean;
    canAdminsBypass?: boolean;
    allowedBranches: string[];
    secretNames: string[];
  };
  security: GovernancePolicy["security"];
  community: { labels: string[]; discussionCategories: string[] };
  release: {
    installedAppSlugs: string[];
    variableNames: string[];
    secretNames: string[];
    appId?: number;
    releaseEnabled?: boolean;
  };
  rulesets: RepositoryRuleset[];
  dependabot: {
    openAlerts: Array<{
      number: number;
      dependency: string;
      manifestPath: string;
      vulnerableRange: string;
    }>;
    openPullRequests: number[];
  };
  projects?: { enabled: boolean; totalCount?: number };
  unavailable: Array<{ path: string; reason: string }>;
};

export type GovernanceResult = {
  schemaVersion: 2;
  profile: GovernanceProfile;
  repository: string;
  status: GovernanceStatus;
  excludedPaths: string[];
  findings: GovernanceFinding[];
  summary: {
    compliant: number;
    drift: number;
    blocked: number;
    unsupported: number;
  };
};

function stable(value: unknown): unknown {
  if (Array.isArray(value)) {
    return [...value]
      .map(stable)
      .sort((left, right) =>
        JSON.stringify(left).localeCompare(JSON.stringify(right)),
      );
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, stable(item)]),
    );
  }
  return value;
}

function equal(left: unknown, right: unknown): boolean {
  return JSON.stringify(stable(left)) === JSON.stringify(stable(right));
}

function isExcluded(snapshot: GovernanceSnapshot, path: string): boolean {
  return snapshot.excludedPaths.some(
    (excluded) => path === excluded || path.startsWith(`${excluded}.`),
  );
}

function exact(
  snapshot: GovernanceSnapshot,
  findings: GovernanceFinding[],
  path: string,
  expected: unknown,
  actual: unknown,
): void {
  if (isExcluded(snapshot, path)) return;
  findings.push(
    equal(expected, actual)
      ? { path, status: "compliant" }
      : { path, status: "drift", expected, actual },
  );
}

function containsAll(
  snapshot: GovernanceSnapshot,
  findings: GovernanceFinding[],
  path: string,
  expected: string[],
  actual: string[],
): void {
  if (isExcluded(snapshot, path)) return;
  const missing = expected.filter((item) => !actual.includes(item));
  findings.push(
    missing.length === 0
      ? { path, status: "compliant" }
      : {
          path,
          status: "drift",
          expected,
          actual,
          reason: `Missing: ${missing.join(", ")}`,
        },
  );
}

function resultStatus(findings: GovernanceFinding[]): GovernanceStatus {
  if (findings.some((finding) => finding.status === "blocked")) {
    return "blocked";
  }
  if (findings.some((finding) => finding.status === "unsupported")) {
    return "unsupported";
  }
  if (findings.some((finding) => finding.status === "drift")) return "drift";
  return "compliant";
}

function inferredReleaseAppId(
  snapshot: GovernanceSnapshot,
): number | undefined {
  if (snapshot.release.appId !== undefined) return snapshot.release.appId;
  if (snapshot.profile !== "ci") return undefined;
  const appIds = new Set(
    snapshot.rulesets.flatMap((ruleset) =>
      ruleset.bypass_actors
        .filter((actor) => actor.actor_type === "Integration")
        .map((actor) => actor.actor_id),
    ),
  );
  return appIds.size === 1 ? [...appIds][0] : undefined;
}

function compareRulesets(
  policy: GovernancePolicy,
  snapshot: GovernanceSnapshot,
  findings: GovernanceFinding[],
): void {
  const active = snapshot.rulesets.filter(
    (ruleset) => ruleset.enforcement === "active",
  );
  containsAll(
    snapshot,
    findings,
    "rulesets.names",
    [
      policy.rulesets.branch,
      policy.rulesets.contributions,
      policy.rulesets.tag,
    ],
    active.map((ruleset) => ruleset.name),
  );
  const byName = new Map(active.map((ruleset) => [ruleset.name, ruleset]));
  const appId = inferredReleaseAppId(snapshot);
  const expected: Array<[string, RepositoryRuleset | undefined]> = [
    [policy.rulesets.branch, buildBranchSafetyRuleset(policy)],
    [
      policy.rulesets.contributions,
      buildBranchContributionRuleset(policy, appId),
    ],
    [policy.rulesets.tag, appId ? buildTagRuleset(policy, appId) : undefined],
  ];
  for (const [name, ruleset] of expected) {
    if (!ruleset) continue;
    exact(
      snapshot,
      findings,
      `rulesets.${name}`,
      canonicalRuleset(ruleset),
      byName.has(name) ? canonicalRuleset(byName.get(name)!) : undefined,
    );
  }
}

function compareDependabot(
  policy: GovernancePolicy,
  snapshot: GovernanceSnapshot,
  findings: GovernanceFinding[],
): void {
  if (isExcluded(snapshot, "dependabot")) return;
  const expectedByNumber = new Map(
    policy.dependabot.inaccurateAlerts.map((alert) => [alert.number, alert]),
  );
  for (const alert of snapshot.dependabot.openAlerts) {
    const expected = expectedByNumber.get(alert.number);
    if (!expected) {
      findings.push({
        path: `dependabot.alerts.${alert.number}`,
        status: "blocked",
        actual: alert,
        reason: "An unclassified Dependabot alert remains open",
      });
      continue;
    }
    const evidenceMatches =
      alert.dependency === expected.dependency &&
      alert.manifestPath === expected.manifestPath &&
      alert.vulnerableRange === expected.vulnerableRange;
    findings.push(
      evidenceMatches
        ? {
            path: `dependabot.alerts.${alert.number}`,
            status: "drift",
            expected: "dismissed as inaccurate after local graph verification",
            actual: alert,
            reason: `The declared ${expected.resolvedVersion} is outside ${expected.vulnerableRange}`,
          }
        : {
            path: `dependabot.alerts.${alert.number}`,
            status: "blocked",
            expected,
            actual: alert,
            reason: "The live alert no longer matches the reviewed evidence",
          },
    );
  }
  for (const expected of policy.dependabot.inaccurateAlerts) {
    if (
      !snapshot.dependabot.openAlerts.some(
        (alert) => alert.number === expected.number,
      )
    ) {
      findings.push({
        path: `dependabot.alerts.${expected.number}`,
        status: "compliant",
      });
    }
  }
  const stillOpen = policy.dependabot.maintenancePullRequests.filter((number) =>
    snapshot.dependabot.openPullRequests.includes(number),
  );
  findings.push(
    stillOpen.length === 0
      ? { path: "dependabot.maintenancePullRequests", status: "compliant" }
      : {
          path: "dependabot.maintenancePullRequests",
          status: "drift",
          expected: [],
          actual: stillOpen,
          reason: "Superseded maintenance pull requests must be closed",
        },
  );
}

export function compareGovernance(
  policy: GovernancePolicy,
  snapshot: GovernanceSnapshot,
): GovernanceResult {
  const findings: GovernanceFinding[] = [];
  exact(
    snapshot,
    findings,
    "repository",
    policy.repository,
    snapshot.repository,
  );

  for (const [key, expected] of Object.entries(policy.repositorySettings)) {
    exact(
      snapshot,
      findings,
      `repositorySettings.${key}`,
      expected,
      snapshot.repositorySettings[
        key as keyof GovernancePolicy["repositorySettings"]
      ],
    );
  }
  for (const [key, expected] of Object.entries(policy.actions)) {
    exact(
      snapshot,
      findings,
      `actions.${key}`,
      expected,
      snapshot.actions[key as keyof GovernancePolicy["actions"]],
    );
  }

  exact(
    snapshot,
    findings,
    "environment.exists",
    true,
    snapshot.environment.exists,
  );
  exact(
    snapshot,
    findings,
    "environment.canAdminsBypass",
    policy.environment.canAdminsBypass,
    snapshot.environment.canAdminsBypass,
  );
  containsAll(
    snapshot,
    findings,
    "environment.allowedBranches",
    [policy.environment.branch],
    snapshot.environment.allowedBranches,
  );
  for (const [key, expected] of Object.entries(policy.security)) {
    exact(
      snapshot,
      findings,
      `security.${key}`,
      expected,
      snapshot.security[key as keyof GovernancePolicy["security"]],
    );
  }

  containsAll(
    snapshot,
    findings,
    "community.labels",
    policy.community.requiredLabels,
    snapshot.community.labels,
  );
  containsAll(
    snapshot,
    findings,
    "community.discussionCategories",
    policy.community.requiredDiscussionCategories,
    snapshot.community.discussionCategories,
  );
  containsAll(
    snapshot,
    findings,
    "release.installedAppSlugs",
    [policy.release.appSlug],
    snapshot.release.installedAppSlugs,
  );
  containsAll(
    snapshot,
    findings,
    "release.variableNames",
    [policy.release.appIdVariable],
    snapshot.release.variableNames,
  );
  containsAll(
    snapshot,
    findings,
    "release.secretNames",
    [policy.release.privateKeySecret],
    snapshot.release.secretNames,
  );
  if (!isExcluded(snapshot, "release.forbiddenSecrets")) {
    const forbidden = policy.release.forbiddenSecrets.filter((secret) =>
      snapshot.release.secretNames.includes(secret),
    );
    findings.push(
      forbidden.length === 0
        ? { path: "release.forbiddenSecrets", status: "compliant" }
        : {
            path: "release.forbiddenSecrets",
            status: "drift",
            expected: [],
            actual: forbidden,
            reason: "Long-lived release secrets must be removed",
          },
    );
  }
  exact(
    snapshot,
    findings,
    "release.releaseEnabled",
    policy.release.releaseEnabled,
    snapshot.release.releaseEnabled,
  );
  compareRulesets(policy, snapshot, findings);
  compareDependabot(policy, snapshot, findings);

  if (!isExcluded(snapshot, "projects")) {
    if (snapshot.projects) {
      const compliant =
        !snapshot.projects.enabled ||
        (snapshot.projects.totalCount !== undefined &&
          snapshot.projects.totalCount > 0);
      findings.push({
        path: "projects",
        status: compliant ? "compliant" : "drift",
        expected:
          snapshot.projects.enabled && snapshot.projects.totalCount === 0
            ? "disabled after verification"
            : "preserved",
        actual: snapshot.projects,
      });
    } else if (!snapshot.unavailable.some((item) => item.path === "projects")) {
      findings.push({
        path: "projects",
        status: "unsupported",
        reason: "Project state requires the read:project scope",
      });
    }
  }

  findings.push(
    ...snapshot.unavailable
      .filter(({ path }) => !isExcluded(snapshot, path))
      .map(({ path, reason }) => ({
        path,
        status: "unsupported" as const,
        reason,
      })),
  );

  const summary = {
    compliant: findings.filter((finding) => finding.status === "compliant")
      .length,
    drift: findings.filter((finding) => finding.status === "drift").length,
    blocked: findings.filter((finding) => finding.status === "blocked").length,
    unsupported: findings.filter((finding) => finding.status === "unsupported")
      .length,
  };
  return {
    schemaVersion: 2,
    profile: snapshot.profile,
    repository: policy.repository,
    status: resultStatus(findings),
    excludedPaths: [...snapshot.excludedPaths].sort(),
    findings: findings.sort((left, right) =>
      left.path.localeCompare(right.path),
    ),
    summary,
  };
}

export function assertGovernancePolicy(value: unknown): GovernancePolicy {
  if (!value || typeof value !== "object") {
    throw new Error("Governance policy must be an object");
  }
  const candidate = value as Partial<GovernancePolicy>;
  if (
    candidate.schemaVersion !== 2 ||
    typeof candidate.repository !== "string" ||
    typeof candidate.environment?.canAdminsBypass !== "boolean"
  ) {
    throw new Error("Unsupported governance policy schema");
  }
  return candidate as GovernancePolicy;
}
