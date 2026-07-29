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
  rulesets: { branch: "protect-master", tag: "protect-tags" },
  requiredChecks: [],
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
        if (endpoint.includes("/variables")) {
          return { variables: [{ name: "RELEASE_ENABLED", value: "true" }] };
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
    expect(JSON.stringify(snapshot)).not.toContain("must-not-be-read");
    expect(requested).toContain(
      "repos/owner/repository/environments/ENV/secrets?per_page=100",
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
