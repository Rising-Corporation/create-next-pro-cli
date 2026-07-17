export type ReleaseAction = "release" | "resume" | "skip" | "error";

export type ReleaseState = {
  currentVersion: string;
  npmVersion: string;
  headSha: string;
  sourceSha: string;
  tagSha?: string;
  headMessage?: string;
};

export type ReleaseDecision = {
  action: ReleaseAction;
  currentVersion: string;
  targetVersion: string;
  sourceSha: string;
  reason: string;
};

type Version = { major: number; minor: number; patch: number };

const VERSION_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const RELEASE_COMMIT_PATTERN = /^chore\(release\): v\d+\.\d+\.\d+$/;

export function parseStableVersion(value: string): Version | undefined {
  const match = VERSION_PATTERN.exec(value);
  if (!match) return undefined;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

export function compareVersions(left: Version, right: Version): number {
  if (left.major !== right.major) return Math.sign(left.major - right.major);
  if (left.minor !== right.minor) return Math.sign(left.minor - right.minor);
  return Math.sign(left.patch - right.patch);
}

export function nextPatch(version: Version): string {
  return `${version.major}.${version.minor}.${version.patch + 1}`;
}

export function decideRelease(state: ReleaseState): ReleaseDecision {
  const base = {
    currentVersion: state.currentVersion,
    targetVersion: state.currentVersion,
    sourceSha: state.sourceSha,
  };
  const current = parseStableVersion(state.currentVersion);
  const published = parseStableVersion(state.npmVersion);

  if (!current || !published) {
    return {
      ...base,
      action: "error",
      reason: "Git and npm versions must be stable semantic versions",
    };
  }

  const comparison = compareVersions(current, published);
  if (comparison < 0) {
    return {
      ...base,
      action: "error",
      reason: "npm is ahead of the version stored on master",
    };
  }

  if (comparison > 0) {
    const isOnePatchAhead =
      current.major === published.major &&
      current.minor === published.minor &&
      current.patch === published.patch + 1;
    if (!isOnePatchAhead || state.tagSha !== state.headSha) {
      return {
        ...base,
        action: "error",
        reason: "The unpublished Git version is not a resumable patch release",
      };
    }
    return {
      ...base,
      action: "resume",
      reason: "The release commit and tag exist but npm is missing the version",
    };
  }

  if (state.headSha !== state.sourceSha) {
    return {
      ...base,
      action: "skip",
      reason: "A newer master commit superseded this workflow run",
    };
  }

  if (state.headMessage && RELEASE_COMMIT_PATTERN.test(state.headMessage)) {
    return {
      ...base,
      action: "skip",
      reason: "The current commit is an already published release commit",
    };
  }

  return {
    ...base,
    action: "release",
    targetVersion: nextPatch(current),
    reason: "The validated master commit requires the next patch release",
  };
}
