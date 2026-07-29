import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, test } from "vitest";

import { createNodeContext, resolvePackageRoot } from "./node-context";

describe("runtime context", () => {
  test("finds the CLI package root from a nested module", () => {
    expect(resolvePackageRoot(import.meta.url)).toBe(process.cwd());
  });

  test("creates files exclusively and releases exclusive locks", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "cnp-runtime-context-"));
    try {
      const context = createNodeContext({ cwd: root });
      const target = path.join(root, "exclusive.txt");
      await context.fs.writeTextExclusive(target, "first\n");
      await expect(
        context.fs.writeTextExclusive(target, "second\n"),
      ).rejects.toMatchObject({ code: "EEXIST" });
      expect(await readFile(target, "utf8")).toBe("first\n");

      const lockPath = path.join(root, "index.lock");
      const release = await context.fs.acquireLock(lockPath);
      await expect(context.fs.acquireLock(lockPath)).rejects.toMatchObject({
        code: "EEXIST",
      });
      await release();
      await release();
      const releaseAgain = await context.fs.acquireLock(lockPath);
      await releaseAgain();
      expect(context.fs.exists(lockPath)).toBe(false);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
