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
    expect(policy.requiredChecks).toContain("governance-check");
  });
});
