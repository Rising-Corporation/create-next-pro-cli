import { describe, expect, test } from "vitest";
import {
  installArguments,
  packageManagerExecutable,
  resolvePackageManager,
} from "../../scripts/package-manager.ts";

describe("package manager dispatch", () => {
  test.each(["bun", "npm", "pnpm"] as const)(
    "accepts the explicit %s override",
    (manager) => {
      expect(resolvePackageManager({ CNP_PACKAGE_MANAGER: manager })).toBe(
        manager,
      );
    },
  );

  test.each([
    ["bun/1.3.14 npm/? node/v24.13.0", "bun"],
    ["npm/11.0.0 node/v24.13.0", "npm"],
    ["pnpm/11.0.0 npm/? node/v24.13.0", "pnpm"],
  ] as const)("detects %s", (userAgent, manager) => {
    expect(resolvePackageManager({ npm_config_user_agent: userAgent })).toBe(
      manager,
    );
  });

  test("rejects unknown and missing managers", () => {
    expect(() =>
      resolvePackageManager({ CNP_PACKAGE_MANAGER: "yarn" }),
    ).toThrow("Unsupported package manager");
    expect(() => resolvePackageManager({})).toThrow(
      "Unable to detect the package manager",
    );
  });

  test("uses Windows command shims without a shell", () => {
    expect(packageManagerExecutable("npm", "win32")).toBe("npm.cmd");
    expect(packageManagerExecutable("pnpm", "win32")).toBe("pnpm.cmd");
    expect(packageManagerExecutable("bun", "win32")).toBe("bun");
  });

  test("uses reproducible install arguments where supported", () => {
    expect(installArguments("bun")).toEqual(["install", "--frozen-lockfile"]);
    expect(installArguments("npm")).toEqual(["install"]);
    expect(installArguments("pnpm")).toEqual([
      "install",
      "--no-frozen-lockfile",
    ]);
  });
});
