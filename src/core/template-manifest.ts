import {
  lstat,
  mkdir,
  readdir,
  readFile,
  writeFile,
  copyFile,
} from "node:fs/promises";
import path from "node:path";

import { CliError } from "./contracts";

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

export async function templateManifest(root: string): Promise<string[]> {
  const files: string[] = [];
  async function visit(directory: string, relativeDirectory = "") {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const relative = path.join(relativeDirectory, entry.name);
      if (!isDistributableTemplatePath(relative)) continue;
      const source = path.join(directory, entry.name);
      const stats = await lstat(source);
      if (stats.isSymbolicLink()) {
        throw new CliError(
          `Symbolic links are forbidden in templates: ${relative}`,
        );
      }
      if (stats.isDirectory()) await visit(source, relative);
      else if (stats.isFile()) files.push(relative);
      else throw new CliError(`Unsupported template entry: ${relative}`);
    }
  }
  await visit(root);
  return files;
}

export async function copyTemplate(
  root: string,
  target: string,
): Promise<string[]> {
  const manifest = await templateManifest(root);
  await mkdir(target, { recursive: true });
  for (const relative of manifest) {
    const destination = path.join(
      target,
      relative === ".gitignore.template" ? ".gitignore" : relative,
    );
    await mkdir(path.dirname(destination), { recursive: true });
    await copyFile(path.join(root, relative), destination);
  }
  return manifest;
}

export async function customizeGeneratedProject(
  target: string,
  projectName: string,
  importAlias: string,
): Promise<void> {
  const packagePath = path.join(target, "package.json");
  const packageJson = JSON.parse(await readFile(packagePath, "utf8")) as Record<
    string,
    unknown
  >;
  packageJson.name = projectName.toLowerCase();
  delete packageJson.packageManager;
  await writeFile(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);

  const tsconfigPath = path.join(target, "tsconfig.json");
  const tsconfigContent = await readFile(tsconfigPath, "utf8");
  const tsconfig = JSON.parse(tsconfigContent) as {
    compilerOptions?: { paths?: Record<string, string[]> };
  };
  if (!tsconfig.compilerOptions?.paths?.["@/*"]) {
    throw new CliError(
      'The template tsconfig must define the default "@/*" alias.',
    );
  }
  await writeFile(
    tsconfigPath,
    tsconfigContent.replace('"@/*"', `"${importAlias}"`),
  );

  if (importAlias !== "@/*") {
    const prefix = importAlias.slice(0, -2);
    for (const relative of await templateManifest(target)) {
      if (!/\.[cm]?[jt]sx?$/.test(relative)) continue;
      const file = path.join(target, relative);
      const content = await readFile(file, "utf8");
      const next = content
        .replaceAll('from "@/', `from "${prefix}/`)
        .replaceAll("from '@/", `from '${prefix}/`);
      if (next !== content) await writeFile(file, next);
    }
  }
}
