import { describe, expect, test } from "vitest";

import {
  browserCommand,
  buildManifestPage,
  configureReleaseAppEnvironment,
  selectSmokeRun,
  withTimeout,
  type ProcessRunner,
} from "../../scripts/github-release-app";
import type { GovernancePolicy } from "./model";
import { buildReleaseAppManifest, ReleaseAppError } from "./release-app";

const policy = {
  schemaVersion: 2,
  repository: "owner/repository",
  repositorySettings: { defaultBranch: "master" },
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

describe("release App runtime boundaries", () => {
  test("checks a configured installation through a fake gh executable", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "release-app-gh-"));
    const executable = path.join(directory, "gh");
    const fake = `#!/bin/sh
case "$*" in
  "repo view Rising-Corporation/create-next-pro-cli --json nameWithOwner,isFork,viewerPermission,id")
    printf '%s' '{"nameWithOwner":"Rising-Corporation/create-next-pro-cli","isFork":false,"viewerPermission":"ADMIN","id":"R_test"}' ;;
  *"user/memberships/orgs/Rising-Corporation"*) printf '%s' '{"state":"active","role":"admin"}' ;;
  *"api orgs/Rising-Corporation --method GET"*) printf '%s' '{"id":12}' ;;
  *"api repos/Rising-Corporation/create-next-pro-cli --method GET"*) printf '%s' '{"id":34}' ;;
  *"/environments/ENV/variables?per_page=100"*) printf '%s' '{"variables":[{"name":"RELEASE_APP_ID","value":"123"}]}' ;;
  *"/environments/ENV/secrets?per_page=100"*) printf '%s' '{"secrets":[{"name":"RELEASE_APP_PRIVATE_KEY"}]}' ;;
  *"/environments/ENV --method GET"*) printf '%s' '{"name":"ENV"}' ;;
  *"/actions/variables?per_page=100"*) printf '%s' '{"variables":[{"name":"RELEASE_ENABLED","value":"false"}]}' ;;
  *"orgs/Rising-Corporation/installations?per_page=100"*) printf '%s' '{"installations":[{"id":456,"app_id":123,"app_slug":"create-next-pro-release","account":{"login":"Rising-Corporation"},"target_type":"Organization","repository_selection":"selected","permissions":{"metadata":"read","contents":"write"},"events":[]}]}' ;;
  *) printf '%s\n' "Unexpected fake gh call: $*" >&2; exit 64 ;;
esac
`;
    try {
      await writeFile(executable, fake, "utf8");
      await chmod(executable, 0o755);
      const output = execFileSync(
        process.execPath,
        ["scripts/github-release-app.ts", "check", "--json"],
        {
          cwd: process.cwd(),
          encoding: "utf8",
          env: {
            ...process.env,
            PATH: `${directory}:${process.env.PATH ?? ""}`,
          },
        },
      );
      expect(JSON.parse(output)).toMatchObject({
        schemaVersion: 1,
        command: "check",
        status: "configured",
        exitCode: 0,
        app: {
          id: 123,
          slug: "create-next-pro-release",
          owner: "Rising-Corporation",
          installationId: 456,
        },
        environment: { releaseEnabled: false },
        error: null,
      });
      expect(output).not.toContain("PRIVATE KEY");
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  test("passes the private key only through secret stdin", () => {
    const calls: Array<{
      command: string;
      args: string[];
      input?: string;
    }> = [];
    const runner: ProcessRunner = (command, args, options) => {
      calls.push({ command, args, input: options?.input });
      return "";
    };
    configureReleaseAppEnvironment(
      policy,
      123,
      "-----BEGIN PRIVATE KEY-----\nsecret\n-----END PRIVATE KEY-----\n",
      runner,
    );
    expect(calls).toHaveLength(2);
    expect(calls[0]).toMatchObject({
      command: "gh",
      args: expect.arrayContaining([
        "variable",
        "set",
        "APP_ID",
        "--body",
        "123",
      ]),
      input: undefined,
    });
    expect(calls[1]).toMatchObject({
      command: "gh",
      args: expect.arrayContaining(["secret", "set", "APP_KEY"]),
      input: "-----BEGIN PRIVATE KEY-----\nsecret\n-----END PRIVATE KEY-----\n",
    });
    expect(calls.flatMap((call) => call.args).join(" ")).not.toContain(
      "PRIVATE KEY",
    );
  });

  test("rolls back only the newly written App ID when secret storage fails", () => {
    const calls: string[][] = [];
    const runner: ProcessRunner = (_command, args) => {
      calls.push(args);
      if (args[0] === "secret") throw new Error("simulated failure");
      return "";
    };
    expect(() =>
      configureReleaseAppEnvironment(policy, 123, "private-key", runner),
    ).toThrowError(
      expect.objectContaining<Partial<ReleaseAppError>>({
        code: "ENV_CONFIGURATION_FAILED",
      }),
    );
    expect(calls).toEqual([
      expect.arrayContaining(["variable", "set", "APP_ID"]),
      expect.arrayContaining(["secret", "set", "APP_KEY"]),
      expect.arrayContaining(["variable", "delete", "APP_ID"]),
    ]);
  });

  test("builds browser commands without a shell on Unix platforms", () => {
    expect(browserCommand("linux", "http://127.0.0.1:1/start")).toEqual({
      command: "xdg-open",
      args: ["http://127.0.0.1:1/start"],
    });
    expect(browserCommand("darwin", "http://127.0.0.1:1/start")).toEqual({
      command: "open",
      args: ["http://127.0.0.1:1/start"],
    });
    expect(browserCommand("win32", "http://127.0.0.1:1/start")).toMatchObject({
      command: "cmd.exe",
      args: ["/d", "/s", "/c", "start", "", "http://127.0.0.1:1/start"],
    });
  });

  test("renders an auto-submitting organization manifest page", () => {
    const state = "A".repeat(43);
    const manifest = buildReleaseAppManifest(
      policy,
      "http://127.0.0.1:1234/",
      state,
    );
    const page = buildManifestPage(policy, manifest, state);
    expect(page).toContain(
      "https://github.com/organizations/owner/settings/apps/new?state=",
    );
    expect(page).toContain('name="manifest"');
    expect(page).toContain('document.getElementById("manifest").submit()');
    expect(page).toContain("&quot;contents&quot;:&quot;write&quot;");
    expect(page).not.toContain("PRIVATE KEY");
  });

  test("selects only the run with the exact correlation title", () => {
    expect(
      selectSmokeRun(
        [
          {
            databaseId: 1,
            status: "completed",
            conclusion: "success",
            url: "https://example.test/1",
            displayTitle: "Release App smoke other",
          },
          {
            databaseId: 2,
            status: "queued",
            conclusion: "",
            url: "https://example.test/2",
            displayTitle: "Release App smoke correlation",
          },
        ],
        "correlation",
      ),
    ).toEqual({
      databaseId: 2,
      status: "queued",
      conclusion: "",
      url: "https://example.test/2",
      displayTitle: "Release App smoke correlation",
    });
  });

  test("returns a structured timeout without waiting for an interactive flow", async () => {
    await expect(
      withTimeout(
        new Promise<never>(() => undefined),
        1,
        "REGISTRATION_TIMEOUT",
        "simulated timeout",
      ),
    ).rejects.toMatchObject({
      code: "REGISTRATION_TIMEOUT",
      exitCode: 1,
      message: "simulated timeout",
    });
  });
});
import { execFileSync } from "node:child_process";
import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
