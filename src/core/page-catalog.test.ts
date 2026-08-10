import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, test } from "vitest";

import { createNodeContext } from "../runtime/node-context";
import { discoverPageCatalog, resolvePageCandidate } from "./page-catalog";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

async function fixture(): Promise<{
  root: string;
  page(relative: string): Promise<void>;
}> {
  const root = await mkdtemp(path.join(tmpdir(), "cnp-page-catalog-"));
  roots.push(root);
  return {
    root,
    async page(relative: string) {
      const directory = path.join(root, "src", "app", "[locale]", relative);
      await mkdir(directory, { recursive: true });
      await writeFile(path.join(directory, "page.tsx"), "export default 1;\n");
    },
  };
}

describe("page catalog", () => {
  test("keeps every official area in stable candidate identifiers", async () => {
    const project = await fixture();
    await project.page("(public)/Profile");
    await project.page("(user)/Account/Security");
    await project.page("(admin)/Audit");
    const catalog = await discoverPageCatalog(
      project.root,
      createNodeContext({ cwd: project.root }).fs,
    );

    expect(catalog.issues).toEqual([]);
    expect(catalog.candidates.map(({ id }) => id)).toEqual([
      "public:Profile",
      "user:Account.Security",
      "admin:Audit",
    ]);
    expect(resolvePageCandidate(catalog, "Account.Security", "user").area).toBe(
      "user",
    );
    expect(resolvePageCandidate(catalog, "Audit", "admin").area).toBe("admin");
  });

  test("isolates ungrouped and duplicate logical routes", async () => {
    const project = await fixture();
    await project.page("Legacy");
    await project.page("(public)/Shared");
    await project.page("(user)/Shared");
    const catalog = await discoverPageCatalog(
      project.root,
      createNodeContext({ cwd: project.root }).fs,
    );

    expect(catalog.candidates).toEqual([]);
    expect(
      catalog.issues.map(({ logicalName, reason }) => ({
        logicalName,
        reason,
      })),
    ).toEqual([
      { logicalName: "Legacy", reason: "ungrouped" },
      { logicalName: "Shared", reason: "duplicate-logical-route" },
    ]);
    expect(() => resolvePageCandidate(catalog, "Shared", "public")).toThrow(
      "inconsistent",
    );
  });

  test("reports unsupported route groups without exposing them as candidates", async () => {
    const project = await fixture();
    await project.page("(staff)/Audit");
    const catalog = await discoverPageCatalog(
      project.root,
      createNodeContext({ cwd: project.root }).fs,
    );

    expect(catalog.candidates).toEqual([]);
    expect(catalog.issues).toEqual([
      expect.objectContaining({
        logicalName: "Audit",
        reason: "unsupported-route-group",
      }),
    ]);
  });
});
