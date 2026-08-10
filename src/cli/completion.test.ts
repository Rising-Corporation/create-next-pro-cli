import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, test } from "vitest";

import { createNodeContext } from "../runtime/node-context";
import { completionCandidates } from "./completion";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

async function fixture() {
  const root = await mkdtemp(path.join(tmpdir(), "cnp-completion-"));
  roots.push(root);
  for (const relative of [
    "(public)/Profile",
    "(user)/Account/Security",
    "(admin)/Audit/Logs",
  ]) {
    const directory = path.join(root, "src", "app", "[locale]", relative);
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, "page.tsx"), "export default 1;\n");
  }
  return createNodeContext({ cwd: root });
}

describe("CLI completion", () => {
  test("suggests page areas after the area option", async () => {
    const context = await fixture();
    await expect(
      completionCandidates(["addpage", "Profile", "--area"], context),
    ).resolves.toEqual(["public", "user", "admin"]);
  });

  test("requires an area before completing removable pages", async () => {
    const context = await fixture();
    await expect(completionCandidates(["rmpage"], context)).resolves.toEqual([
      "--area",
    ]);
    await expect(
      completionCandidates(["rmpage", "--area", "user"], context),
    ).resolves.toEqual(["Account.Security"]);
    await expect(
      completionCandidates(["rmpage", "--area", "admin"], context),
    ).resolves.toEqual(["Audit.Logs"]);
  });

  test("filters page-scoped component candidates by area", async () => {
    const context = await fixture();
    await expect(
      completionCandidates(
        ["addcomponent", "Card", "--area", "public", "--page"],
        context,
      ),
    ).resolves.toEqual(["Profile"]);
    await expect(
      completionCandidates(
        ["addcomponent", "Panel", "--area", "admin", "--page"],
        context,
      ),
    ).resolves.toEqual(["Audit.Logs"]);
  });
});
