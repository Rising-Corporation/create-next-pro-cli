import { describe, expect, test } from "vitest";

import {
  inspectPackage,
  requiredPackageFiles,
} from "../../scripts/inspect-package";

describe("package allowlist", () => {
  test("accepts the expected published surface", () => {
    expect(
      inspectPackage([
        {
          filename: "create-next-pro-cli-0.1.27.tgz",
          files: [
            { path: "package.json" },
            { path: "dist/create-next-pro" },
            ...requiredPackageFiles.map((path) => ({ path })),
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
            ...requiredPackageFiles.map((required) => ({ path: required })),
            { path },
          ],
        },
      ]),
    ).toThrow();
  });

  test.each(["CHANGELOG.md", "templates/Projects/default/bun.lock"])(
    "rejects an archive missing required file %s",
    (missing) => {
      expect(() =>
        inspectPackage([
          {
            filename: "package.tgz",
            files: requiredPackageFiles
              .filter((path) => path !== missing)
              .map((path) => ({ path })),
          },
        ]),
      ).toThrow(`required package entry is missing: ${missing}`);
    },
  );
});
