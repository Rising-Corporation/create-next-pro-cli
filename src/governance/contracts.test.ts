import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { describe, expect, test } from "vitest";

import { PUBLIC_COMMANDS } from "../cli/completion";
import { assertGovernancePolicy } from "./model";

async function collectWorkflows(directory: string): Promise<string[]> {
  return (await readdir(directory, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && /\.ya?ml$/.test(entry.name))
    .map((entry) => path.join(directory, entry.name));
}

describe("public governance contracts", () => {
  test("pins every GitHub Action to an immutable commit", async () => {
    const files = [
      ...(await collectWorkflows(".github/workflows")),
      ...(await collectWorkflows(
        "templates/Projects/default/.github/workflows",
      )),
    ];
    for (const file of files) {
      const source = await readFile(file, "utf8");
      const references = [...source.matchAll(/uses:\s+[^\s@]+@([^\s#]+)/g)];
      expect(references.length, file).toBeGreaterThan(0);
      for (const [, reference] of references) {
        expect(reference, `${file} uses a mutable action reference`).toMatch(
          /^[0-9a-f]{40}$/,
        );
      }
    }
  });

  test("validates human commits and every pull request title", async () => {
    const workflow = await readFile(".github/workflows/ci.yml", "utf8");
    expect(workflow).toMatch(
      /- name: Validate commit messages\n\s+if: github\.actor != 'dependabot\[bot\]'/,
    );
    expect(workflow).toMatch(
      /- name: Validate pull request title\n\s+if: github\.event_name == 'pull_request'/,
    );
  });

  test("documents a restricted public contribution workflow", async () => {
    const contributing = await readFile("CONTRIBUTING.md", "utf8");
    expect(contributing).toContain(
      "Public visibility does not grant write access.",
    );
    expect(contributing).toContain(
      "Only repository administrators may push directly to `master`",
    );
    expect(contributing).toContain(
      "Workflows from every external fork require maintainer approval",
    );
    expect(contributing).toContain(
      "Pull request workflows are read-only and cannot publish a package or update `master`.",
    );
    expect(contributing).not.toContain(".agent/");
  });

  test("keeps functionality documentation aligned with public operations", async () => {
    const functionality = await readFile("FUNCTIONALITY.md", "utf8");
    expect(functionality).toContain("create-next-pro <project>");
    for (const command of PUBLIC_COMMANDS.filter(
      (candidate) => !candidate.startsWith("--"),
    )) {
      expect(functionality, command).toContain(`\`${command}`);
    }
    expect(functionality).not.toContain("__complete");
  });

  test("ships private security reporting and structured contribution forms", async () => {
    const security = await readFile("SECURITY.md", "utf8");
    expect(security).toContain("/security/advisories/new");
    const issueFiles = await readdir(".github/ISSUE_TEMPLATE");
    expect(issueFiles.sort()).toEqual([
      "bug.yml",
      "config.yml",
      "documentation.yml",
      "feature.yml",
    ]);
    for (const file of issueFiles.filter((name) => name !== "config.yml")) {
      const source = await readFile(
        path.join(".github/ISSUE_TEMPLATE", file),
        "utf8",
      );
      expect(source).toMatch(/^name: /m);
      expect(source).toMatch(/^description: /m);
      expect(source).toContain("validations:");
    }
  });

  test("loads the versioned governance policy", async () => {
    const policy = assertGovernancePolicy(
      JSON.parse(
        await readFile(".github/governance/policy.json", "utf8"),
      ) as unknown,
    );
    expect(policy.repository).toBe("Rising-Corporation/create-next-pro-cli");
    expect(policy.schemaVersion).toBe(2);
    expect(policy.environment.canAdminsBypass).toBe(false);
    expect(policy.requiredChecks).toContain("governance-check");
    expect(policy.release).toMatchObject({
      appName: "create-next-pro-release",
      appSlug: "create-next-pro-release",
      appOwner: "Rising-Corporation",
      appPublic: false,
      permissions: { metadata: "read", contents: "write" },
      events: [],
      webhookActive: false,
      appIdVariable: "RELEASE_APP_ID",
      privateKeySecret: "RELEASE_APP_PRIVATE_KEY",
    });
  });

  test("requires the dedicated release App without a token fallback", async () => {
    const workflow = await readFile(".github/workflows/ci.yml", "utf8");
    expect(workflow).toContain("Mint the dedicated release App token");
    expect(workflow).toContain("token: ${{ steps.release-app.outputs.token }}");
    expect(workflow).not.toContain("|| github.token");
    expect(workflow).not.toMatch(
      /Mint the dedicated release App token\n\s+if:/,
    );
    expect(workflow).toContain(
      'git_head=$(npm view "create-next-pro-cli@$expected" gitHead 2>/dev/null || true)',
    );
  });

  test("keeps the release App smoke workflow isolated from master and npm", async () => {
    const workflow = await readFile(
      ".github/workflows/release-app-smoke.yml",
      "utf8",
    );
    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).toContain(
      "run-name: Release App smoke ${{ inputs.correlation_id }}",
    );
    expect(workflow).toContain("correlation_id:");
    expect(workflow).toContain("governance/release-app-smoke-");
    expect(workflow).toContain("v0.0.0-smoke.");
    expect(workflow).not.toContain("npm publish");
    expect(workflow).not.toContain("HEAD:master");
    expect(workflow).toContain("if: always()");
  });

  test("keeps reviewed Dependabot evidence aligned with the template graph", async () => {
    const policy = assertGovernancePolicy(
      JSON.parse(
        await readFile(".github/governance/policy.json", "utf8"),
      ) as unknown,
    );
    const manifest = JSON.parse(
      await readFile("templates/Projects/default/package.json", "utf8"),
    ) as { dependencies?: Record<string, string> };
    const lockfile = await readFile(
      "templates/Projects/default/bun.lock",
      "utf8",
    );
    const lockedNextVersions = new Set(
      [...lockfile.matchAll(/\bnext@(\d+\.\d+\.\d+)/g)].map(
        (match) => match[1],
      ),
    );
    expect(lockedNextVersions).toEqual(new Set(["16.2.11"]));
    for (const alert of policy.dependabot.inaccurateAlerts) {
      expect(alert.dependency).toBe("next");
      expect(alert.manifestPath).toBe(
        "templates/Projects/default/package.json",
      );
      expect(manifest.dependencies?.next).toBe(alert.resolvedVersion);
      expect(lockedNextVersions).toContain(alert.resolvedVersion);
    }
  });
});
