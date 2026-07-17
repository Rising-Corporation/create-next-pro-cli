import { describe, expect, test } from "vitest";

import { inspectPackage } from "../../scripts/inspect-package";

describe("package allowlist", () => {
  test("accepts the expected published surface", () => {
    expect(
      inspectPackage([
        {
          filename: "create-next-pro-cli-0.1.27.tgz",
          files: [
            { path: "package.json" },
            { path: "dist/create-next-pro" },
            { path: "templates/Projects/default/.env.example" },
          ],
        },
      ]),
    ).toBe("create-next-pro-cli-0.1.27.tgz");
  });

  test.each([
    "templates/Projects/default/.env",
    "templates/Projects/default/.git/config",
    "templates/Projects/default-old/package.json",
    "artifacts/capture.png",
    "scripts/release.ts",
  ])("rejects forbidden or unknown entry %s", (path) => {
    expect(() =>
      inspectPackage([{ filename: "package.tgz", files: [{ path }] }]),
    ).toThrow();
  });
});
