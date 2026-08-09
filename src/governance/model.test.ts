import { describe, expect, test } from "vitest";

import {
  assertGovernancePolicy,
  CI_EXCLUDED_PATHS,
  compareGovernance,
  type GovernancePolicy,
  type GovernanceSnapshot,
} from "./model";
import {
  buildBranchContributionRuleset,
  buildBranchSafetyRuleset,
  buildTagRuleset,
} from "./rulesets";

const policy: GovernancePolicy = {
  schemaVersion: 2,
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
    forkPullRequestApprovalPolicy: "all_external_contributors",
  },
  environment: { name: "ENV", branch: "master", canAdminsBypass: false },
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
    appName: "release-app",
    appSlug: "release-app",
    appOwner: "owner",
    appPublic: false,
    permissions: { metadata: "read", contents: "write" },
    events: [],
    webhookActive: false,
    appIdVariable: "APP_ID",
    privateKeySecret: "APP_KEY",
    forbiddenSecrets: ["OLD_TOKEN"],
    releaseEnabled: true,
  },
  rulesets: {
    branch: "protect-master",
    contributions: "govern-master-contributions",
    tag: "protect-tags",
    allowAdminDirectPush: true,
  },
  requiredChecks: ["validate"],
  dependabot: {
    inaccurateAlerts: [
      {
        number: 25,
        dependency: "next",
        manifestPath: "template/package.json",
        vulnerableRange: "<15.5.21",
        resolvedVersion: "16.2.11",
      },
    ],
    maintenancePullRequests: [10],
  },
  cleanup: { pullRequests: [], branches: [] },
  projectsPolicy: "disable-if-empty",
};

const snapshot: GovernanceSnapshot = {
  profile: "admin",
  excludedPaths: [],
  repository: "owner/repository",
  repositorySettings: { ...policy.repositorySettings },
  actions: { ...policy.actions },
  environment: {
    exists: true,
    canAdminsBypass: false,
    allowedBranches: ["master"],
    secretNames: ["APP_KEY"],
  },
  security: { ...policy.security },
  community: { labels: ["bug", "security"], discussionCategories: ["Q&A"] },
  release: {
    installedAppSlugs: ["release-app"],
    variableNames: ["APP_ID"],
    secretNames: ["APP_KEY"],
    appId: 123,
    releaseEnabled: true,
  },
  rulesets: [
    buildBranchSafetyRuleset(policy),
    buildBranchContributionRuleset(policy, 123),
    buildTagRuleset(policy, 123),
  ],
  dependabot: { openAlerts: [], openPullRequests: [] },
  projects: { enabled: true, totalCount: 1 },
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

  test("keeps CI exclusions explicit without treating them as drift", () => {
    expect(CI_EXCLUDED_PATHS).toEqual([
      "actions",
      "dependabot",
      "environment",
      "projects",
      "release",
      "security",
      "rulesets.releaseAppIdentity",
    ]);
    const result = compareGovernance(policy, {
      ...snapshot,
      profile: "ci",
      excludedPaths: [...CI_EXCLUDED_PATHS],
      actions: { ...snapshot.actions, defaultWorkflowPermissions: "write" },
      environment: { exists: false, allowedBranches: [], secretNames: [] },
      release: {
        installedAppSlugs: [],
        variableNames: [],
        secretNames: [],
      },
      security: {
        ...snapshot.security,
        privateVulnerabilityReporting: false,
      },
      projects: undefined,
    });
    expect(result.profile).toBe("ci");
    expect(result.excludedPaths).toEqual([...CI_EXCLUDED_PATHS].sort());
    expect(result.status).toBe("compliant");
  });

  test("detects exact ruleset drift, not only a matching name", () => {
    const contribution = buildBranchContributionRuleset(policy, 123);
    contribution.rules = contribution.rules.filter(
      (rule) => rule.type !== "required_status_checks",
    );
    const result = compareGovernance(policy, {
      ...snapshot,
      rulesets: [
        buildBranchSafetyRuleset(policy),
        contribution,
        buildTagRuleset(policy, 123),
      ],
    });
    expect(result.findings).toContainEqual(
      expect.objectContaining({
        path: "rulesets.govern-master-contributions",
        status: "drift",
      }),
    );
  });

  test("blocks unclassified Dependabot alerts and tracks reviewed drift", () => {
    const reviewed = compareGovernance(policy, {
      ...snapshot,
      dependabot: {
        openAlerts: [
          {
            number: 25,
            dependency: "next",
            manifestPath: "template/package.json",
            vulnerableRange: "<15.5.21",
          },
        ],
        openPullRequests: [10],
      },
    });
    expect(reviewed.status).toBe("drift");
    expect(reviewed.findings).toContainEqual(
      expect.objectContaining({
        path: "dependabot.alerts.25",
        status: "drift",
      }),
    );
    const unknown = compareGovernance(policy, {
      ...snapshot,
      dependabot: {
        openAlerts: [
          {
            number: 99,
            dependency: "other",
            manifestPath: "package.json",
            vulnerableRange: "<1.0.0",
          },
        ],
        openPullRequests: [],
      },
    });
    expect(unknown.status).toBe("blocked");
  });

  test("rejects invalid policy schemas", () => {
    expect(() => assertGovernancePolicy({ schemaVersion: 1 })).toThrow(
      "Unsupported governance policy schema",
    );
  });
});
