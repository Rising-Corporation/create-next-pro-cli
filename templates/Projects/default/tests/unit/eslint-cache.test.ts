import { ESLint } from "eslint";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const root = fileURLToPath(new URL("../../", import.meta.url));
const eslint = new ESLint({ cwd: root });

describe("cache exclusions", () => {
  test.each([
    ".bun/cache/broken.tsx",
    ".cache/broken.tsx",
    "src/nested/.bun/broken.tsx",
    "src/nested/.cache/broken.tsx",
  ])("ignores cached source %s", async (relative) => {
    expect(await eslint.isPathIgnored(path.join(root, relative))).toBe(true);
  });

  test("still checks React rules in application source", async () => {
    const [result] = await eslint.lintText(
      "export default function Example() { return [<div />]; }",
      { filePath: path.join(root, "src/cache-rule-probe.tsx") },
    );
    expect(
      result.messages.some((message) => message.ruleId === "react/jsx-key"),
    ).toBe(true);
  });
});
