import { generateKeyPairSync, verify } from "node:crypto";

import { describe, expect, test } from "vitest";

import type { GovernancePolicy } from "./model";
import {
  buildReleaseAppInstallationUrl,
  buildReleaseAppManifest,
  createReleaseAppJwt,
  decideReleaseAppSetup,
  parseInstallationCallback,
  parseRegistrationCallback,
  ReleaseAppError,
  safeReleaseAppResult,
  validateAuthenticatedApp,
  validateManifestConversion,
  validateReleaseAppInstallation,
} from "./release-app";

const policy = {
  schemaVersion: 2,
  repository: "owner/repository",
  environment: { name: "ENV", branch: "master", canAdminsBypass: false },
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
    forbiddenSecrets: [],
    releaseEnabled: true,
  },
} as unknown as GovernancePolicy;

const state = "A".repeat(43);
const origin = "http://127.0.0.1:43210/";

function privateKey(): string {
  return generateKeyPairSync("rsa", { modulusLength: 2048 })
    .privateKey.export({ type: "pkcs8", format: "pem" })
    .toString();
}

function conversion(pem = privateKey()): Record<string, unknown> {
  return {
    id: 123,
    slug: "release-app",
    owner: { login: "owner" },
    permissions: { metadata: "read", contents: "write" },
    events: [],
    pem,
    client_secret: "must-not-be-retained",
    webhook_secret: "must-not-be-retained",
  };
}

function installation(): Record<string, unknown> {
  return {
    id: 456,
    app_id: 123,
    app_slug: "release-app",
    account: { login: "owner" },
    target_type: "Organization",
    repository_selection: "selected",
    permissions: { metadata: "read", contents: "write" },
    events: [],
  };
}

describe("release App manifest", () => {
  test("builds the private least-privilege registration contract", () => {
    expect(buildReleaseAppManifest(policy, origin, state)).toEqual({
      name: "release-app",
      url: "https://github.com/owner/repository",
      hook_attributes: {
        url: "https://github.com/owner/repository",
        active: false,
      },
      redirect_url: "http://127.0.0.1:43210/callback",
      setup_url: `http://127.0.0.1:43210/installed?state=${state}`,
      public: false,
      default_permissions: { metadata: "read", contents: "write" },
      default_events: [],
      request_oauth_on_install: false,
      setup_on_update: false,
    });
  });

  test("accepts only loopback callbacks with the exact state", () => {
    expect(
      parseRegistrationCallback(
        `/callback?code=${"c".repeat(40)}&state=${state}`,
        origin,
        state,
      ),
    ).toBe("c".repeat(40));
    expect(
      parseInstallationCallback(
        `/installed?installation_id=456&state=${state}`,
        origin,
        state,
      ),
    ).toBe(456);
    expect(() =>
      parseRegistrationCallback(
        `/callback?code=${"c".repeat(40)}&state=wrong`,
        origin,
        state,
      ),
    ).toThrowError(
      expect.objectContaining<Partial<ReleaseAppError>>({
        code: "STATE_MISMATCH",
      }),
    );
  });

  test("builds a repository-preselected installation URL", () => {
    const url = new URL(buildReleaseAppInstallationUrl(policy, 12, 34));
    expect(url.pathname).toBe(
      "/apps/release-app/installations/new/permissions",
    );
    expect(url.searchParams.get("suggested_target_id")).toBe("12");
    expect(url.searchParams.get("repository_ids[]")).toBe("34");
  });
});

describe("release App identity", () => {
  test("retains only the required conversion fields", () => {
    const pem = privateKey();
    const result = validateManifestConversion(conversion(pem), policy);
    expect(result).toMatchObject({
      id: 123,
      slug: "release-app",
      owner: "owner",
      permissions: { metadata: "read", contents: "write" },
      events: [],
    });
    expect(result.privateKey).toBe(pem);
    expect(JSON.stringify(result)).not.toContain("must-not-be-retained");
    expect(
      validateAuthenticatedApp(
        {
          ...conversion(pem),
          pem: undefined,
        },
        policy,
        123,
      ),
    ).not.toHaveProperty("privateKey");
  });

  test("rejects permission widening without leaking response secrets", () => {
    let caught: unknown;
    try {
      validateManifestConversion(
        {
          ...conversion(),
          permissions: { metadata: "read", contents: "write", issues: "read" },
        },
        policy,
      );
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(ReleaseAppError);
    expect(JSON.stringify(caught)).not.toContain("must-not-be-retained");
  });

  test("signs a short-lived RS256 App JWT", () => {
    const { privateKey: key, publicKey } = generateKeyPairSync("rsa", {
      modulusLength: 2048,
    });
    const pem = key.export({ type: "pkcs8", format: "pem" }).toString();
    const jwt = createReleaseAppJwt(123, pem, 1_800_000_000);
    const [header, payload, signature] = jwt.split(".");
    expect(JSON.parse(Buffer.from(payload, "base64url").toString())).toEqual({
      iat: 1_799_999_940,
      exp: 1_800_000_540,
      iss: 123,
    });
    expect(
      verify(
        "RSA-SHA256",
        Buffer.from(`${header}.${payload}`),
        publicKey,
        Buffer.from(signature, "base64url"),
      ),
    ).toBe(true);
  });
});

describe("release App installation", () => {
  test("accepts exactly one selected governed repository", () => {
    expect(
      validateReleaseAppInstallation(
        installation(),
        {
          total_count: 1,
          repositories: [{ full_name: "owner/repository" }],
        },
        policy,
        123,
      ),
    ).toEqual({
      id: 456,
      appId: 123,
      appSlug: "release-app",
      owner: "owner",
      repositorySelection: "selected",
      permissions: { metadata: "read", contents: "write" },
      events: [],
      repository: "owner/repository",
    });
  });

  test("rejects all-repository and multiple-repository installations", () => {
    expect(() =>
      validateReleaseAppInstallation(
        { ...installation(), repository_selection: "all" },
        {
          total_count: 1,
          repositories: [{ full_name: "owner/repository" }],
        },
        policy,
        123,
      ),
    ).toThrowError(
      expect.objectContaining<Partial<ReleaseAppError>>({
        code: "INSTALLATION_SCOPE_MISMATCH",
      }),
    );
    expect(() =>
      validateReleaseAppInstallation(
        installation(),
        {
          total_count: 2,
          repositories: [
            { full_name: "owner/repository" },
            { full_name: "owner/other" },
          ],
        },
        policy,
        123,
      ),
    ).toThrowError(ReleaseAppError);
  });
});

describe("release App setup decisions", () => {
  const empty = {
    environmentExists: true,
    releaseEnabled: "false",
    privateKeySecretPresent: false,
    installations: [],
  };

  test("creates, resumes, and verifies without duplicating the App", () => {
    expect(decideReleaseAppSetup(empty, policy)).toEqual({ action: "create" });
    expect(
      decideReleaseAppSetup(
        { ...empty, appIdValue: "123", privateKeySecretPresent: true },
        policy,
      ),
    ).toEqual({ action: "resume-installation", appId: 123 });
    expect(
      decideReleaseAppSetup(
        {
          ...empty,
          appIdValue: "123",
          privateKeySecretPresent: true,
          installations: [{ appId: 123, appSlug: "release-app" }],
        },
        policy,
      ),
    ).toEqual({ action: "verify", appId: 123 });
  });

  test("rejects partial credentials and enabled releases", () => {
    expect(() =>
      decideReleaseAppSetup({ ...empty, appIdValue: "123" }, policy),
    ).toThrowError(
      expect.objectContaining<Partial<ReleaseAppError>>({
        code: "PARTIAL_CONFIGURATION",
      }),
    );
    expect(() =>
      decideReleaseAppSetup({ ...empty, releaseEnabled: "true" }, policy),
    ).toThrowError(
      expect.objectContaining<Partial<ReleaseAppError>>({
        code: "PRECONDITION_FAILED",
      }),
    );
  });

  test("constructs safe machine output without secret values", () => {
    const result = safeReleaseAppResult(policy, "check", {
      status: "configured",
      exitCode: 0,
      app: { id: 123, slug: "release-app", owner: "owner" },
    });
    expect(result.environment.privateKeySecret).toBe("APP_KEY");
    expect(JSON.stringify(result)).not.toContain("PRIVATE KEY");
  });
});
