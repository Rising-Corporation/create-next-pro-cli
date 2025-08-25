import { describe, expect, test } from "bun:test";
import { toFileName } from "./utils";

describe("toFileName", () => {
  const cases: [string, string][] = [
    ["layout", "layout.tsx"],
    ["page", "page.tsx"],
    ["loading", "loading.tsx"],
    ["not-found", "not-found.tsx"],
    ["error", "error.tsx"],
    ["global-error", "global-error.tsx"],
    ["route", "route.ts"],
    ["template", "template.tsx"],
    ["default", "default.tsx"],
    ["foo", "foo.tsx"],
  ];

  for (const [key, expected] of cases) {
    test(`maps "${key}" to "${expected}"`, () => {
      expect(toFileName(key)).toBe(expected);
    });
  }
});
