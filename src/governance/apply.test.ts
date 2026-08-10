import { describe, expect, test } from "vitest";

import type { GovernancePolicy } from "./model";
import {
  assertGovernanceApplyPreconditions,
  parseGovernanceApplyStage,
  type GovernanceApplySnapshot,
} from "./apply";

const policy = {
  repository: "Rising-Corporation/create-next-pro-cli",
  repositorySettings: { defaultBranch: "master" },
  release: {
    appSlug: "create-next-pro-release",
    appOwner: "Rising-Corporation",
    appIdVariable: "RELEASE_APP_ID",
    privateKeySecret: "RELEASE_APP_PRIVATE_KEY",
  },
} as GovernancePolicy;

const installation = {
  appId: 4541190,
  appSlug: "create-next-pro-release",
  owner: "Rising-Corporation",
  targetType: "Organization",
  repositorySelection: "selected",
  permissions: { metadata: "read", contents: "write" },
  events: [],
};

const valid: GovernanceApplySnapshot = {
  ci: false,
  confirmation: policy.repository,
  worktreeClean: true,
  branch: "master",
  head: "abc123",
  remoteHead: "abc123",
  repository: policy.repository,
  fork: false,
  administrator: true,
  releaseEnabled: "false",
  appIdValue: "4541190",
  environmentSecretNames: ["RELEASE_APP_PRIVATE_KEY"],
  installation,
};

describe("governance apply preconditions", () => {
  test("validates the stage before operator state is inspected", () => {
    expect(parseGovernanceApplyStage(undefined)).toBe("settings");
    expect(parseGovernanceApplyStage("full")).toBe("full");
    expect(() => parseGovernanceApplyStage("invalid")).toThrow(
      "--stage must be settings, minimal, branch, or full",
    );
  });

  test("accepts a synchronized administrator with release disabled", () => {
    expect(assertGovernanceApplyPreconditions(policy, "full", valid)).toEqual({
      stage: "full",
      appId: 4541190,
    });
  });

  test.each([
    ["wrong branch", { branch: "fix/governance" }, "must run from master"],
    ["stale master", { remoteHead: "newer" }, "HEAD to match origin/master"],
    ["active release", { releaseEnabled: "true" }, "RELEASE_ENABLED=false"],
    [
      "missing release state",
      { releaseEnabled: undefined },
      "RELEASE_ENABLED=false",
    ],
    [
      "missing private key name",
      { environmentSecretNames: [] },
      "RELEASE_APP_PRIVATE_KEY environment secret",
    ],
  ])(
    "rejects %s before a mutation is attempted",
    (_name, override, message) => {
      let mutations = 0;
      expect(() => {
        assertGovernanceApplyPreconditions(policy, "full", {
          ...valid,
          ...override,
        });
        mutations += 1;
      }).toThrow(message);
      expect(mutations).toBe(0);
    },
  );

  test("rejects an installation whose permissions drift", () => {
    expect(() =>
      assertGovernanceApplyPreconditions(policy, "full", {
        ...valid,
        installation: {
          ...installation,
          permissions: { metadata: "read", contents: "read" },
        },
      }),
    ).toThrow("release App installation");
  });
});
