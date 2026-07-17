import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, test } from "vitest";

import { CliError } from "./core/contracts";
import { scaffoldProject } from "./scaffold";

const temporaryDirectories: string[] = [];
const options = {
  projectName: "generated-app",
  useTypescript: true,
  useEslint: true,
  useTailwind: true,
  useSrcDir: true,
  useTurbopack: true,
  useI18n: true,
  customAlias: true,
  importAlias: "@/*",
};

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

async function fixture() {
  const root = await mkdtemp(path.join(tmpdir(), "cnp-scaffold-"));
  temporaryDirectories.push(root);
  const template = path.join(root, "template");
  await mkdir(template);
  await writeFile(
    path.join(template, "package.json"),
    JSON.stringify({ name: "fixture", dependencies: {} }),
  );
  await writeFile(path.join(template, "preserved.txt"), "template content");
  return { root, template, target: path.join(root, options.projectName) };
}

describe("project scaffolding", () => {
  test("creates a project from an injected template", async () => {
    const { root, template, target } = await fixture();
    await scaffoldProject(options, { cwd: root, templatePath: template });
    expect(await readFile(path.join(target, "preserved.txt"), "utf8")).toBe(
      "template content",
    );
    expect(
      JSON.parse(await readFile(path.join(target, "cnp.config.json"), "utf8")),
    ).toMatchObject(options);
  });

  test("refuses an existing destination without force", async () => {
    const { root, template, target } = await fixture();
    await mkdir(target);
    await expect(
      scaffoldProject(options, { cwd: root, templatePath: template }),
    ).rejects.toBeInstanceOf(CliError);
  });

  test("replaces an existing child destination with force", async () => {
    const { root, template, target } = await fixture();
    await mkdir(target);
    await writeFile(path.join(target, "old.txt"), "old");
    await scaffoldProject(
      { ...options, force: true },
      { cwd: root, templatePath: template },
    );
    await expect(
      readFile(path.join(target, "old.txt"), "utf8"),
    ).rejects.toThrow();
    expect(await readFile(path.join(target, "preserved.txt"), "utf8")).toBe(
      "template content",
    );
  });
});
