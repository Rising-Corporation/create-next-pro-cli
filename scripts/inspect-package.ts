import { readFileSync } from "node:fs";
import process from "node:process";

import { PROJECT_AGENT_GUIDANCE_FILES } from "../src/core/agent-guidance";

type PackEntry = {
  filename: string;
  files: Array<{ path: string }>;
};

const allowedFiles = new Set([
  "LICENSE",
  "README.md",
  "create-next-pro-completion.sh",
  "create-next-pro-completion.zsh",
  "package.json",
  "public/cnp-banner.svg",
  "public/logo.svg",
]);
const allowedPrefixes = [
  "dist/",
  "templates/Api/",
  "templates/Component/",
  "templates/Lib/",
  "templates/Page/",
  "templates/Projects/default/",
];
const forbiddenSegments = new Set([
  ".agent",
  ".cursor",
  ".git",
  ".next",
  "artifacts",
  "coverage",
  "default-old",
  "node_modules",
  "playwright-report",
  "test-results",
]);
export const requiredTemplateFiles = [
  ...PROJECT_AGENT_GUIDANCE_FILES.map(
    (path) => `templates/Projects/default/${path}`,
  ),
  "templates/Projects/default/.env.example",
  "templates/Projects/default/.gitignore.template",
  "templates/Projects/default/.prettierignore",
  "templates/Projects/default/.github/workflows/quality.yml",
  "templates/Projects/default/bun.lock",
  "templates/Projects/default/pnpm-workspace.yaml",
  "templates/Projects/default/scripts/audit.ts",
  "templates/Projects/default/scripts/package-manager.ts",
  "templates/Projects/default/tests/consumer/validate-template.ts",
  "templates/Projects/default/vitest.config.ts",
] as const;

export function inspectPackage(entries: PackEntry[]): string {
  if (entries.length !== 1)
    throw new Error("npm pack must produce exactly one archive");
  const packagePaths = new Set<string>();
  for (const file of entries[0].files) {
    const path = file.path.replace(/^package\//, "");
    packagePaths.add(path);
    const segments = path.split("/");
    if (
      forbiddenSegments.has(path) ||
      segments.some((part) => forbiddenSegments.has(part))
    ) {
      throw new Error(`forbidden package entry: ${path}`);
    }
    const basename = segments.at(-1) ?? "";
    if (basename.startsWith(".env") && basename !== ".env.example") {
      throw new Error(`forbidden environment file: ${path}`);
    }
    if (
      !allowedFiles.has(path) &&
      !allowedPrefixes.some((prefix) => path.startsWith(prefix))
    ) {
      throw new Error(`package entry is outside the allowlist: ${path}`);
    }
  }
  for (const required of requiredTemplateFiles) {
    if (!packagePaths.has(required)) {
      throw new Error(`required package entry is missing: ${required}`);
    }
  }
  return entries[0].filename;
}

const input = process.argv[2];
if (input) {
  try {
    const output = readFileSync(input, "utf8");
    const jsonStart = output.indexOf("[");
    if (jsonStart < 0) throw new Error("npm pack returned no JSON payload");
    const entries = JSON.parse(output.slice(jsonStart)) as PackEntry[];
    process.stdout.write(`${inspectPackage(entries)}\n`);
  } catch (error) {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  }
}
