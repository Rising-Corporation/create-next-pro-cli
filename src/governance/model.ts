export type GovernanceStatus =
  "compliant" | "drift" | "blocked" | "unsupported";

export type GovernanceFinding = {
  path: string;
  status: GovernanceStatus;
  expected?: unknown;
  actual?: unknown;
  reason?: string;
};

export type GovernancePolicy = {
  schemaVersion: 1;
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
  };
  environment: { name: string; branch: string };
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
  rulesets: { branch: string; tag: string };
  requiredChecks: string[];
  projectsPolicy: "disable-if-empty";
};

export type GovernanceSnapshot = {
  repository: string;
  repositorySettings: GovernancePolicy["repositorySettings"];
  actions: GovernancePolicy["actions"];
  environment: {
    exists: boolean;
    allowedBranches: string[];
    secretNames: string[];
  };
  security: GovernancePolicy["security"];
  community: { labels: string[]; discussionCategories: string[] };
  release: {
    installedAppSlugs: string[];
    variableNames: string[];
    secretNames: string[];
    releaseEnabled?: boolean;
  };
  rulesets: Array<{ name: string; enforcement: string }>;
  projects?: { totalCount: number };
  unavailable: Array<{ path: string; reason: string }>;
};

export type GovernanceResult = {
  schemaVersion: 1;
  repository: string;
  status: GovernanceStatus;
  findings: GovernanceFinding[];
  summary: {
    compliant: number;
    drift: number;
    blocked: number;
    unsupported: number;
  };
};

function stable(value: unknown): unknown {
  return Array.isArray(value)
    ? [...value]
        .map(stable)
        .sort((left, right) =>
          JSON.stringify(left).localeCompare(JSON.stringify(right)),
        )
    : value;
}

function equal(left: unknown, right: unknown): boolean {
  return JSON.stringify(stable(left)) === JSON.stringify(stable(right));
}

function exact(
  findings: GovernanceFinding[],
  path: string,
  expected: unknown,
  actual: unknown,
): void {
  findings.push(
    equal(expected, actual)
      ? { path, status: "compliant" }
      : { path, status: "drift", expected, actual },
  );
}

function containsAll(
  findings: GovernanceFinding[],
  path: string,
  expected: string[],
  actual: string[],
): void {
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
  if (findings.some((finding) => finding.status === "blocked"))
    return "blocked";
  if (findings.some((finding) => finding.status === "drift")) return "drift";
  if (findings.some((finding) => finding.status === "unsupported"))
    return "unsupported";
  return "compliant";
}

export function compareGovernance(
  policy: GovernancePolicy,
  snapshot: GovernanceSnapshot,
): GovernanceResult {
  const findings: GovernanceFinding[] = [];
  exact(findings, "repository", policy.repository, snapshot.repository);

  for (const [key, expected] of Object.entries(policy.repositorySettings)) {
    exact(
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
      findings,
      `actions.${key}`,
      expected,
      snapshot.actions[key as keyof GovernancePolicy["actions"]],
    );
  }

  exact(findings, "environment.exists", true, snapshot.environment.exists);
  containsAll(
    findings,
    "environment.allowedBranches",
    [policy.environment.branch],
    snapshot.environment.allowedBranches,
  );
  for (const [key, expected] of Object.entries(policy.security)) {
    exact(
      findings,
      `security.${key}`,
      expected,
      snapshot.security[key as keyof GovernancePolicy["security"]],
    );
  }

  containsAll(
    findings,
    "community.labels",
    policy.community.requiredLabels,
    snapshot.community.labels,
  );
  containsAll(
    findings,
    "community.discussionCategories",
    policy.community.requiredDiscussionCategories,
    snapshot.community.discussionCategories,
  );
  containsAll(
    findings,
    "release.installedAppSlugs",
    [policy.release.appSlug],
    snapshot.release.installedAppSlugs,
  );
  containsAll(
    findings,
    "release.variableNames",
    [policy.release.appIdVariable],
    snapshot.release.variableNames,
  );
  containsAll(
    findings,
    "release.secretNames",
    [policy.release.privateKeySecret],
    snapshot.release.secretNames,
  );
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
  exact(
    findings,
    "release.releaseEnabled",
    policy.release.releaseEnabled,
    snapshot.release.releaseEnabled,
  );
  containsAll(
    findings,
    "rulesets",
    [policy.rulesets.branch, policy.rulesets.tag],
    snapshot.rulesets
      .filter((ruleset) => ruleset.enforcement === "active")
      .map((ruleset) => ruleset.name),
  );

  if (snapshot.projects) {
    findings.push({
      path: "projects",
      status: snapshot.projects.totalCount === 0 ? "drift" : "compliant",
      expected:
        snapshot.projects.totalCount === 0
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

  findings.push(
    ...snapshot.unavailable.map(({ path, reason }) => ({
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
    schemaVersion: 1,
    repository: policy.repository,
    status: resultStatus(findings),
    findings: findings.sort((left, right) =>
      left.path.localeCompare(right.path),
    ),
    summary,
  };
}

export function assertGovernancePolicy(value: unknown): GovernancePolicy {
  if (!value || typeof value !== "object")
    throw new Error("Governance policy must be an object");
  const candidate = value as Partial<GovernancePolicy>;
  if (
    candidate.schemaVersion !== 1 ||
    typeof candidate.repository !== "string"
  ) {
    throw new Error("Unsupported governance policy schema");
  }
  return candidate as GovernancePolicy;
}
