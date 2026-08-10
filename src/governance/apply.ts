import type { GovernancePolicy } from "./model";
import type { RulesetStage } from "./rulesets";

export type GovernanceApplyStage = "settings" | RulesetStage;

export type GovernanceApplyInstallation = {
  appId?: number;
  appSlug?: string;
  owner?: string;
  targetType?: string;
  repositorySelection?: string;
  permissions?: Record<string, unknown>;
  events?: unknown[];
};

export type GovernanceApplySnapshot = {
  ci: boolean;
  confirmation?: string;
  worktreeClean: boolean;
  branch: string;
  head: string;
  remoteHead: string;
  repository: string;
  fork: boolean;
  administrator: boolean;
  releaseEnabled?: string;
  appIdValue?: string;
  environmentSecretNames: string[];
  installation?: GovernanceApplyInstallation;
};

export type GovernanceApplyPreconditions = {
  stage: GovernanceApplyStage;
  appId?: number;
};

export function parseGovernanceApplyStage(
  value: string | undefined,
): GovernanceApplyStage {
  const stage = value ?? "settings";
  if (
    stage !== "settings" &&
    stage !== "minimal" &&
    stage !== "branch" &&
    stage !== "full"
  ) {
    throw new Error("--stage must be settings, minimal, branch, or full");
  }
  return stage;
}

function exactPermissions(value: Record<string, unknown> | undefined): boolean {
  if (!value) return false;
  const entries = Object.entries(value)
    .filter((entry): entry is [string, string] => typeof entry[1] === "string")
    .sort(([left], [right]) => left.localeCompare(right));
  return (
    JSON.stringify(entries) ===
    JSON.stringify([
      ["contents", "write"],
      ["metadata", "read"],
    ])
  );
}

function assertInstallation(
  installation: GovernanceApplyInstallation | undefined,
  policy: GovernancePolicy,
  appId: number,
  source: string,
): void {
  if (
    !installation ||
    installation.appId !== appId ||
    installation.appSlug !== policy.release.appSlug ||
    installation.owner !== policy.release.appOwner ||
    installation.targetType !== "Organization" ||
    installation.repositorySelection !== "selected" ||
    !exactPermissions(installation.permissions) ||
    !Array.isArray(installation.events) ||
    installation.events.length !== 0
  ) {
    throw new Error(
      `${source} does not match the governed ${policy.release.appSlug} installation`,
    );
  }
}

export function assertGovernanceApplyPreconditions(
  policy: GovernancePolicy,
  stage: GovernanceApplyStage,
  snapshot: GovernanceApplySnapshot,
): GovernanceApplyPreconditions {
  if (snapshot.ci) throw new Error("github:apply is disabled in CI");
  if (snapshot.confirmation !== policy.repository) {
    throw new Error(`github:apply requires --confirm ${policy.repository}`);
  }
  if (!snapshot.worktreeClean) {
    throw new Error("github:apply requires a clean worktree");
  }
  if (snapshot.branch !== policy.repositorySettings.defaultBranch) {
    throw new Error(
      `github:apply must run from ${policy.repositorySettings.defaultBranch}`,
    );
  }
  if (snapshot.head !== snapshot.remoteHead) {
    throw new Error(
      `github:apply requires HEAD to match origin/${policy.repositorySettings.defaultBranch}`,
    );
  }
  if (snapshot.repository !== policy.repository || snapshot.fork) {
    throw new Error("github:apply refuses a different repository or a fork");
  }
  if (!snapshot.administrator) {
    throw new Error(
      "github:apply requires repository administration permission",
    );
  }
  if (snapshot.releaseEnabled !== "false") {
    throw new Error(
      "github:apply requires RELEASE_ENABLED=false before any remote mutation",
    );
  }
  if (stage !== "full") return { stage };

  const appId = Number(snapshot.appIdValue);
  if (!Number.isSafeInteger(appId) || appId <= 0) {
    throw new Error(
      `Full governance requires a valid ${policy.release.appIdVariable}`,
    );
  }
  if (
    !snapshot.environmentSecretNames.includes(policy.release.privateKeySecret)
  ) {
    throw new Error(
      `Full governance requires the ${policy.release.privateKeySecret} environment secret`,
    );
  }
  assertInstallation(
    snapshot.installation,
    policy,
    appId,
    "The release App installation",
  );
  return { stage, appId };
}
