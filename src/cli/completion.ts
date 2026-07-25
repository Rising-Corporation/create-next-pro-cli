import path from "node:path";

import type { CliContext } from "../core/contracts";
import { PAGE_AREAS, isPageArea, type PageArea } from "../core/page-area";
import { discoverPageCatalog } from "../core/page-catalog";

export const PUBLIC_COMMANDS = [
  "addpage",
  "addcomponent",
  "addlib",
  "addapi",
  "addlanguage",
  "addtext",
  "rmpage",
  "--help",
  "--version",
  "--json",
  "--reconfigure",
] as const;

const OPTIONS: Record<string, string[]> = {
  addpage: [
    "--area",
    "--layout",
    "--page",
    "--loading",
    "--not-found",
    "--error",
    "--global-error",
    "--route",
    "--template",
    "--default",
  ],
  addcomponent: ["--page", "-P"],
};

async function directories(
  root: string,
  context: CliContext,
): Promise<string[]> {
  try {
    return (await context.fs.list(root))
      .filter((entry) => entry.isDirectory && !entry.name.startsWith("_"))
      .map((entry) => entry.name)
      .sort();
  } catch {
    return [];
  }
}

function selectedArea(args: string[]): PageArea | undefined {
  const index = args.lastIndexOf("--area");
  if (index < 0) return undefined;
  const value = args[index + 1];
  return value && isPageArea(value) ? value : undefined;
}

function uniqueSorted(candidates: string[]): string[] {
  return [...new Set(candidates)].sort((left, right) =>
    left.localeCompare(right),
  );
}

export async function completionCandidates(
  words: string[],
  context: CliContext,
): Promise<string[]> {
  if (words.length === 0) return [...PUBLIC_COMMANDS];
  const [command, ...args] = words;
  const previous = args.at(-1);
  if (previous === "--area") return [...PAGE_AREAS];

  const area = selectedArea(args);
  const hasArea = args.includes("--area");
  if (command === "rmpage") {
    if (!area) return hasArea ? [] : ["--area"];
    const catalog = await discoverPageCatalog(context.cwd, context.fs);
    return uniqueSorted(
      catalog.candidates
        .filter((candidate) => candidate.area === area)
        .map((candidate) => candidate.logicalName),
    );
  }

  if (command === "addcomponent") {
    const pageOptionIndex = args.findIndex(
      (argument) => argument === "--page" || argument === "-P",
    );
    if (previous === "--page" || previous === "-P") {
      const catalog = await discoverPageCatalog(context.cwd, context.fs);
      return uniqueSorted(
        catalog.candidates
          .filter((candidate) => !area || candidate.area === area)
          .map((candidate) => candidate.logicalName),
      );
    }
    return uniqueSorted([
      ...(OPTIONS.addcomponent ?? []),
      ...(pageOptionIndex >= 0 && !hasArea ? ["--area"] : []),
    ]);
  }

  if (command === "addpage") {
    return uniqueSorted([
      ...(OPTIONS.addpage ?? []).filter(
        (candidate) => candidate !== "--area" || !hasArea,
      ),
      ...(await directories(path.join(context.cwd, "src", "ui"), context)),
    ]);
  }

  if (command === "addlanguage")
    return ["de", "en", "es", "fr", "it", "ja", "pt"];
  return uniqueSorted(OPTIONS[command] ?? []);
}

export async function printCompletions(
  args: string[],
  context: CliContext,
): Promise<void> {
  for (const candidate of await completionCandidates(args.slice(1), context)) {
    context.terminal.log(candidate);
  }
}
