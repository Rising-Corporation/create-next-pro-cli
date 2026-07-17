import path from "node:path";

import { CliError } from "./contracts";
import type { CliContext, CliFileSystem } from "./contracts";
import { MutationGateway } from "./operations";

export const TEMPLATE_DENY_NAMES = new Set([
  ".env",
  ".git",
  ".agent",
  ".cursor",
  ".next",
  "node_modules",
  "artifacts",
  "coverage",
  "playwright-report",
  "test-results",
]);

export function isDistributableTemplatePath(relativePath: string): boolean {
  const segments = relativePath.split(path.sep);
  return !segments.some(
    (segment) =>
      TEMPLATE_DENY_NAMES.has(segment) ||
      segment.endsWith(".tsbuildinfo") ||
      segment === ".DS_Store",
  );
}

export async function templateManifest(
  root: string,
  fs: CliFileSystem,
): Promise<string[]> {
  const files: string[] = [];
  async function visit(directory: string, relativeDirectory = "") {
    const entries = await fs.list(directory);
    for (const entry of entries) {
      const relative = path.join(relativeDirectory, entry.name);
      if (!isDistributableTemplatePath(relative)) continue;
      const source = path.join(directory, entry.name);
      if (entry.isSymbolicLink) {
        throw new CliError(
          `Symbolic links are forbidden in templates: ${relative}`,
          { code: "UNSAFE_PATH", scope: "package", path: relative },
        );
      }
      if (entry.isDirectory) await visit(source, relative);
      else if (entry.isFile) files.push(relative);
      else
        throw new CliError(`Unsupported template entry: ${relative}`, {
          code: "TEMPLATE_MISSING",
          scope: "package",
          path: relative,
        });
    }
  }
  await visit(root);
  return files;
}

export async function validateScaffoldTemplate(
  root: string,
  fs: CliFileSystem,
): Promise<string[]> {
  const manifest = await templateManifest(root, fs);
  for (const required of ["package.json", "tsconfig.json"]) {
    if (!manifest.includes(required)) {
      throw new CliError(`Required template file was not found: ${required}.`, {
        code: "TEMPLATE_MISSING",
        scope: "package",
        path: `templates/Projects/default/${required}`,
      });
    }
  }
  try {
    JSON.parse(await fs.readText(path.join(root, "package.json")));
    const tsconfig = JSON.parse(
      await fs.readText(path.join(root, "tsconfig.json")),
    ) as { compilerOptions?: { paths?: Record<string, string[]> } };
    if (!tsconfig.compilerOptions?.paths?.["@/*"]) throw new Error("alias");
  } catch {
    throw new CliError(
      'The template manifests must be valid JSON and define the default "@/*" alias.',
      {
        code: "TEMPLATE_MISSING",
        scope: "package",
        path: "templates/Projects/default",
      },
    );
  }
  return manifest;
}

export async function copyTemplate(
  root: string,
  target: string,
  context: CliContext,
  gateway: MutationGateway,
  manifest?: string[],
): Promise<string[]> {
  const files = manifest ?? (await templateManifest(root, context.fs));
  for (const relative of files) {
    const destination = path.join(
      target,
      relative === ".gitignore.template" ? ".gitignore" : relative,
    );
    const source = path.join(root, relative);
    await gateway.copy(source, destination, {
      role: "template-file",
      source: { template: `Projects/default/${relative}` },
    });
  }
  return files;
}

export async function customizeGeneratedProject(
  target: string,
  projectName: string,
  importAlias: string,
  context: CliContext,
  gateway: MutationGateway,
): Promise<void> {
  const packagePath = path.join(target, "package.json");
  const packageJson = JSON.parse(
    await context.fs.readText(packagePath),
  ) as Record<string, unknown>;
  packageJson.name = projectName.toLowerCase();
  delete packageJson.packageManager;
  await gateway.write(
    packagePath,
    `${JSON.stringify(packageJson, null, 2)}\n`,
    { role: "package-manifest" },
  );

  const tsconfigPath = path.join(target, "tsconfig.json");
  const tsconfigContent = await context.fs.readText(tsconfigPath);
  const tsconfig = JSON.parse(tsconfigContent) as {
    compilerOptions?: { paths?: Record<string, string[]> };
  };
  if (!tsconfig.compilerOptions?.paths?.["@/*"]) {
    throw new CliError(
      'The template tsconfig must define the default "@/*" alias.',
      {
        code: "TEMPLATE_MISSING",
        scope: "package",
        path: "templates/Projects/default/tsconfig.json",
      },
    );
  }
  await gateway.write(
    tsconfigPath,
    tsconfigContent.replace('"@/*"', `"${importAlias}"`),
    { role: "typescript-configuration" },
  );

  if (importAlias !== "@/*") {
    const prefix = importAlias.slice(0, -2);
    for (const relative of await templateManifest(target, context.fs)) {
      if (!/\.[cm]?[jt]sx?$/.test(relative)) continue;
      const file = path.join(target, relative);
      const content = await context.fs.readText(file);
      const next = content
        .replaceAll('from "@/', `from "${prefix}/`)
        .replaceAll("from '@/", `from '${prefix}/`);
      if (next !== content) {
        await gateway.write(file, next, { role: "import-alias-reference" });
      }
    }
  }
}
