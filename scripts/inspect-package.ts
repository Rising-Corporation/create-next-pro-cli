import { readFileSync } from "node:fs";
import process from "node:process";

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

export function inspectPackage(entries: PackEntry[]): string {
  if (entries.length !== 1)
    throw new Error("npm pack must produce exactly one archive");
  for (const file of entries[0].files) {
    const path = file.path.replace(/^package\//, "");
    const segments = path.split("/");
    if (
      forbiddenSegments.has(path) ||
      segments.some((part) => forbiddenSegments.has(part))
    ) {
      throw new Error(`forbidden package entry: ${path}`);
    }
    if (
      segments.at(-1) === ".env" ||
      /\.env\.(?!example$)/.test(segments.at(-1) ?? "")
    ) {
      throw new Error(`forbidden environment file: ${path}`);
    }
    if (
      !allowedFiles.has(path) &&
      !allowedPrefixes.some((prefix) => path.startsWith(prefix))
    ) {
      throw new Error(`package entry is outside the allowlist: ${path}`);
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
