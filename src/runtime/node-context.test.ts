import { describe, expect, test } from "vitest";

import { resolvePackageRoot } from "./node-context";

describe("runtime context", () => {
  test("finds the CLI package root from a nested module", () => {
    expect(resolvePackageRoot(import.meta.url)).toBe(process.cwd());
  });
});
