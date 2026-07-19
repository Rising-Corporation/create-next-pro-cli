import { describe, expect, test } from "vitest";

import { inspectPackage } from "../../scripts/inspect-package";

describe("package allowlist", () => {
  const requiredTemplateFiles = [
    "templates/Projects/default/.env.example",
    "templates/Projects/default/.gitignore.template",
    "templates/Projects/default/.prettierignore",
    "templates/Projects/default/.github/workflows/quality.yml",
    "templates/Projects/default/bun.lock",
    "templates/Projects/default/pnpm-workspace.yaml",
    "templates/Projects/default/scripts/audit.ts",
    "templates/Projects/default/scripts/package-manager.ts",
    "templates/Projects/default/tests/consumer/validate-template.ts",
    "templates/Projects/default/vitest.config.ts",
  ];

  test("accepts the expected published surface", () => {
    expect(
      inspectPackage([
        {
          filename: "create-next-pro-cli-0.1.27.tgz",
          files: [
            { path: "package.json" },
            { path: "dist/create-next-pro" },
            ...requiredTemplateFiles.map((path) => ({ path })),
          ],
        },
      ]),
    ).toBe("create-next-pro-cli-0.1.27.tgz");
  });

  test.each([
    "templates/Projects/default/.env",
    "templates/Projects/default/.env copy.example",
    "templates/Projects/default/.env.example.backup",
    "templates/Projects/default/.git/config",
    "templates/Projects/default-old/package.json",
    "artifacts/capture.png",
    "scripts/release.ts",
  ])("rejects forbidden or unknown entry %s", (path) => {
    expect(() =>
      inspectPackage([
        {
          filename: "package.tgz",
          files: [
            ...requiredTemplateFiles.map((required) => ({ path: required })),
            { path },
          ],
        },
      ]),
    ).toThrow();
  });

  test("rejects an archive missing a required template file", () => {
    expect(() =>
      inspectPackage([
        {
          filename: "package.tgz",
          files: requiredTemplateFiles
            .filter((path) => !path.endsWith("bun.lock"))
            .map((path) => ({ path })),
        },
      ]),
    ).toThrow("required package entry is missing");
  });
});
