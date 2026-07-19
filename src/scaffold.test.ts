import {
  mkdtemp,
  mkdir,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, test, vi } from "vitest";

import { CliError, type PromptRunner } from "./core/contracts";
import { createNodeContext } from "./runtime/node-context";
import { scaffoldProject } from "./scaffold";
import { createProjectWithPrompt } from "./lib/createProjectWithPrompt";

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
    JSON.stringify({
      name: "fixture",
      packageManager: "bun@1.3.14",
      dependencies: {},
    }),
  );
  await writeFile(path.join(template, ".env"), "SECRET=not-copied\n");
  await writeFile(
    path.join(template, ".env copy.example"),
    "SECRET=also-not-copied\n",
  );
  await mkdir(path.join(template, ".git"));
  await writeFile(path.join(template, ".git", "config"), "not copied");
  await writeFile(path.join(template, ".gitignore.template"), ".env*\n");
  await writeFile(path.join(template, ".gitignore"), "local-only\n");
  await writeFile(path.join(template, ".env.example"), "PUBLIC=true\n");
  await writeFile(path.join(template, ".prettierignore"), "bun.lock\n");
  await writeFile(path.join(template, "bun.lock"), "fixture-lock\n");
  await writeFile(path.join(template, "pnpm-workspace.yaml"), "packages: []\n");
  await writeFile(
    path.join(template, "vitest.config.ts"),
    "export default {};\n",
  );
  await mkdir(path.join(template, "scripts"));
  await writeFile(path.join(template, "scripts", "audit.ts"), "export {};\n");
  await writeFile(
    path.join(template, "scripts", "package-manager.ts"),
    "export {};\n",
  );
  await mkdir(path.join(template, "tests", "consumer"), {
    recursive: true,
  });
  await writeFile(
    path.join(template, "tests", "consumer", "validate-template.ts"),
    "export {};\n",
  );
  await mkdir(path.join(template, ".github", "workflows"), {
    recursive: true,
  });
  await writeFile(
    path.join(template, ".github", "workflows", "quality.yml"),
    "name: Quality\n",
  );
  await writeFile(
    path.join(template, "tsconfig.json"),
    JSON.stringify({ compilerOptions: { paths: { "@/*": ["./src/*"] } } }),
  );
  await writeFile(path.join(template, "preserved.txt"), "template content");
  await mkdir(path.join(template, "src"));
  await writeFile(
    path.join(template, "src", "example.ts"),
    'import value from "@/value";\nexport default value;\n',
  );
  return { root, template, target: path.join(root, options.projectName) };
}

function runtime(cwd: string, templatePath: string) {
  return {
    context: createNodeContext({ cwd }),
    templatePath,
  };
}

describe("project scaffolding", () => {
  test("creates a project through the injected interactive assistant", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "cnp-interactive-"));
    temporaryDirectories.push(root);
    const context = createNodeContext({
      cwd: root,
      prompt: vi.fn(async () => options) as unknown as PromptRunner,
    });
    const result = await createProjectWithPrompt(context);
    expect(result).toMatchObject({
      command: "create",
      status: "success",
      exitCode: 0,
    });
    expect(
      JSON.parse(
        await readFile(
          path.join(root, options.projectName, "cnp.config.json"),
          "utf8",
        ),
      ),
    ).toMatchObject(options);
  });

  test("creates a project from an injected template", async () => {
    const { root, template, target } = await fixture();
    await scaffoldProject(options, runtime(root, template));
    expect(await readFile(path.join(target, "preserved.txt"), "utf8")).toBe(
      "template content",
    );
    expect(
      JSON.parse(await readFile(path.join(target, "cnp.config.json"), "utf8")),
    ).toMatchObject(options);
    expect(
      JSON.parse(await readFile(path.join(target, "package.json"), "utf8")),
    ).toMatchObject({ name: "generated-app" });
    expect(
      JSON.parse(await readFile(path.join(target, "package.json"), "utf8")),
    ).not.toHaveProperty("packageManager");
    await expect(readFile(path.join(target, ".env"), "utf8")).rejects.toThrow();
    await expect(
      readFile(path.join(target, ".env copy.example"), "utf8"),
    ).rejects.toThrow();
    await expect(
      readFile(path.join(target, ".git", "config"), "utf8"),
    ).rejects.toThrow();
    expect(await readFile(path.join(target, ".gitignore"), "utf8")).toBe(
      ".env*\n",
    );
  });

  test("refuses an existing destination without force", async () => {
    const { root, template, target } = await fixture();
    await mkdir(target);
    await expect(
      scaffoldProject(options, runtime(root, template)),
    ).rejects.toBeInstanceOf(CliError);
  });

  test("replaces an existing child destination with force", async () => {
    const { root, template, target } = await fixture();
    await mkdir(target);
    await writeFile(path.join(target, "old.txt"), "old");
    await scaffoldProject({ ...options, force: true }, runtime(root, template));
    await expect(
      readFile(path.join(target, "old.txt"), "utf8"),
    ).rejects.toThrow();
    expect(await readFile(path.join(target, "preserved.txt"), "utf8")).toBe(
      "template content",
    );
  });

  test.each(["../outside", "/tmp/outside", "nested/project", "bad\\name"])(
    "rejects unsafe project name %s",
    async (projectName) => {
      const { root, template } = await fixture();
      await expect(
        scaffoldProject({ ...options, projectName }, runtime(root, template)),
      ).rejects.toBeInstanceOf(CliError);
    },
  );

  test("applies a validated custom import alias", async () => {
    const { root, template, target } = await fixture();
    await scaffoldProject(
      { ...options, importAlias: "@core/*" },
      runtime(root, template),
    );
    expect(
      await readFile(path.join(target, "src", "example.ts"), "utf8"),
    ).toContain('from "@core/value"');
    const tsconfig = JSON.parse(
      await readFile(path.join(target, "tsconfig.json"), "utf8"),
    ) as { compilerOptions: { paths: Record<string, string[]> } };
    expect(tsconfig.compilerOptions.paths).toHaveProperty("@core/*");
  });

  test("rejects symbolic links in a template", async () => {
    const { root, template } = await fixture();
    await symlink(
      path.join(template, "preserved.txt"),
      path.join(template, "linked.txt"),
    );
    await expect(
      scaffoldProject(options, runtime(root, template)),
    ).rejects.toBeInstanceOf(CliError);
  });

  test("rejects unsupported feature combinations before writing", async () => {
    const { root, template, target } = await fixture();
    await expect(
      scaffoldProject(
        { ...options, useTailwind: false },
        runtime(root, template),
      ),
    ).rejects.toThrow("requires: useTailwind");
    await expect(
      readFile(path.join(target, "package.json"), "utf8"),
    ).rejects.toThrow();
  });
});
