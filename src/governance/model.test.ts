import { describe, expect, test } from "vitest";

import {
  assertGovernancePolicy,
  compareGovernance,
  type GovernancePolicy,
  type GovernanceSnapshot,
} from "./model";

const policy: GovernancePolicy = {
  schemaVersion: 1,
  repository: "owner/repository",
  repositorySettings: {
    defaultBranch: "master",
    visibility: "public",
    allowMergeCommit: false,
    allowSquashMerge: true,
    allowRebaseMerge: false,
    allowAutoMerge: true,
    deleteBranchOnMerge: true,
    hasIssues: true,
    hasDiscussions: true,
    hasWiki: false,
  },
  actions: {
    enabled: true,
    allowedActions: "selected",
    shaPinningRequired: true,
    defaultWorkflowPermissions: "read",
    canApprovePullRequestReviews: false,
  },
  environment: { name: "ENV", branch: "master" },
  security: {
    privateVulnerabilityReporting: true,
    automatedSecurityFixes: true,
    secretScanning: true,
    pushProtection: true,
    codeqlState: "configured",
  },
  community: {
    requiredLabels: ["security"],
    requiredDiscussionCategories: ["Q&A"],
  },
  release: {
    appSlug: "release-app",
    appIdVariable: "APP_ID",
    privateKeySecret: "APP_KEY",
    forbiddenSecrets: ["OLD_TOKEN"],
    releaseEnabled: true,
  },
  rulesets: { branch: "protect-master", tag: "protect-tags" },
  requiredChecks: ["validate"],
  cleanup: { pullRequests: [], branches: [] },
  projectsPolicy: "disable-if-empty",
};

const snapshot: GovernanceSnapshot = {
  repository: "owner/repository",
  repositorySettings: { ...policy.repositorySettings },
  actions: { ...policy.actions },
  environment: {
    exists: true,
    allowedBranches: ["master"],
    secretNames: ["APP_KEY"],
  },
  security: { ...policy.security },
  community: { labels: ["bug", "security"], discussionCategories: ["Q&A"] },
  release: {
    installedAppSlugs: ["release-app"],
    variableNames: ["APP_ID"],
    secretNames: ["APP_KEY"],
    releaseEnabled: true,
  },
  rulesets: [
    { name: "protect-master", enforcement: "active" },
    { name: "protect-tags", enforcement: "active" },
  ],
  projects: { totalCount: 1 },
  unavailable: [],
};

describe("governance model", () => {
  test("reports a compliant normalized state", () => {
    expect(compareGovernance(policy, snapshot)).toMatchObject({
      status: "compliant",
      summary: { drift: 0, blocked: 0, unsupported: 0 },
    });
  });

  test("reports drift without exposing secret values", () => {
    const result = compareGovernance(policy, {
      ...snapshot,
      actions: { ...snapshot.actions, defaultWorkflowPermissions: "write" },
      release: { ...snapshot.release, secretNames: ["OLD_TOKEN"] },
    });
    expect(result.status).toBe("drift");
    expect(result.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "actions.defaultWorkflowPermissions",
          status: "drift",
        }),
        expect.objectContaining({
          path: "release.forbiddenSecrets",
          actual: ["OLD_TOKEN"],
        }),
      ]),
    );
    expect(JSON.stringify(result)).not.toContain("secret-value");
  });

  test("marks unavailable project metadata without guessing", () => {
    const result = compareGovernance(policy, {
      ...snapshot,
      projects: undefined,
    });
    expect(result.status).toBe("unsupported");
    expect(result.findings).toContainEqual(
      expect.objectContaining({ path: "projects", status: "unsupported" }),
    );
  });

  test("rejects invalid policy schemas", () => {
    expect(() => assertGovernancePolicy({ schemaVersion: 2 })).toThrow(
      "Unsupported governance policy schema",
    );
  });
});
