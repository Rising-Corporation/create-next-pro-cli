import { describe, expect, test } from "vitest";

import { collectGithubSnapshot, type GithubTransport } from "./github";
import type { GovernancePolicy } from "./model";

const policy = {
  schemaVersion: 1,
  repository: "owner/repository",
  repositorySettings: {},
  actions: {},
  environment: { name: "ENV", branch: "master" },
  security: {},
  community: { requiredLabels: [], requiredDiscussionCategories: [] },
  release: {
    appSlug: "release-app",
    appIdVariable: "APP_ID",
    privateKeySecret: "APP_KEY",
    forbiddenSecrets: [],
    releaseEnabled: true,
  },
  rulesets: {
    branch: "protect-master",
    contributions: "govern-master-contributions",
    tag: "protect-tags",
    allowAdminDirectPush: true,
  },
  requiredChecks: [],
  cleanup: { pullRequests: [], branches: [] },
  projectsPolicy: "disable-if-empty",
} as unknown as GovernancePolicy;

describe("GitHub governance adapter", () => {
  test("collects names without reading environment secret values", async () => {
    const requested: string[] = [];
    const transport: GithubTransport = {
      async request(endpoint) {
        requested.push(endpoint);
        if (endpoint === "repos/owner/repository") {
          return {
            full_name: "owner/repository",
            default_branch: "master",
            visibility: "public",
            security_and_analysis: {
              secret_scanning: { status: "enabled" },
              secret_scanning_push_protection: { status: "enabled" },
            },
          };
        }
        if (endpoint.includes("/secrets")) {
          return { secrets: [{ name: "APP_KEY", value: "must-not-be-read" }] };
        }
        if (endpoint.includes("/environments/ENV/variables")) {
          return { variables: [{ name: "APP_ID", value: "123" }] };
        }
        if (endpoint.endsWith("/actions/variables?per_page=100")) {
          return { variables: [{ name: "RELEASE_ENABLED", value: "true" }] };
        }
        if (endpoint.endsWith("/fork-pr-contributor-approval")) {
          return { approval_policy: "all_external_contributors" };
        }
        if (endpoint.includes("/installations")) {
          return { installations: [{ app_slug: "release-app" }] };
        }
        if (endpoint.endsWith("/rulesets?per_page=100")) return [];
        if (endpoint.endsWith("/labels?per_page=100")) return [];
        return {};
      },
      async graphql(query) {
        if (query.includes("projectsV2")) {
          return { data: { repository: { projectsV2: { totalCount: 0 } } } };
        }
        return {
          data: {
            repository: { discussionCategories: { nodes: [{ name: "Q&A" }] } },
          },
        };
      },
    };

    const snapshot = await collectGithubSnapshot(policy, transport);
    expect(snapshot.release.secretNames).toEqual(["APP_KEY"]);
    expect(snapshot.release.variableNames).toEqual(["APP_ID"]);
    expect(snapshot.release.releaseEnabled).toBe(true);
    expect(snapshot.actions.forkPullRequestApprovalPolicy).toBe(
      "all_external_contributors",
    );
    expect(JSON.stringify(snapshot)).not.toContain("must-not-be-read");
    expect(requested).toContain(
      "repos/owner/repository/environments/ENV/secrets?per_page=100",
    );
    expect(requested).toContain(
      "repos/owner/repository/environments/ENV/variables?per_page=100",
    );
    expect(requested).toContain(
      "repos/owner/repository/actions/permissions/fork-pr-contributor-approval",
    );
  });

  test("records inaccessible endpoints instead of guessing", async () => {
    const transport: GithubTransport = {
      async request() {
        throw new Error("permission denied");
      },
      async graphql() {
        throw new Error("missing scope");
      },
    };
    const snapshot = await collectGithubSnapshot(policy, transport);
    expect(snapshot.unavailable.length).toBeGreaterThan(0);
    expect(snapshot.unavailable).toContainEqual(
      expect.objectContaining({ path: "projects", reason: "missing scope" }),
    );
  });
});
