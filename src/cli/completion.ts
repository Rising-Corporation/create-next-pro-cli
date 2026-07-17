import { readdir } from "node:fs/promises";
import path from "node:path";

import type { CliContext } from "../core/contracts";
import { discoverPages } from "../core/page-catalog";

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
  "--reconfigure",
] as const;

const OPTIONS: Record<string, string[]> = {
  addpage: [
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

async function directories(root: string): Promise<string[]> {
  try {
    return (await readdir(root, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith("_"))
      .map((entry) => entry.name)
      .sort();
  } catch {
    return [];
  }
}

export async function completionCandidates(
  command: string | undefined,
  context: CliContext,
): Promise<string[]> {
  if (!command) return [...PUBLIC_COMMANDS];
  if (command === "rmpage") {
    return (await discoverPages(context.cwd)).map(
      (candidate) => candidate.logicalName,
    );
  }
  if (command === "addcomponent" || command === "addpage") {
    return [
      ...(OPTIONS[command] ?? []),
      ...(await directories(path.join(context.cwd, "src", "ui"))),
    ];
  }
  if (command === "addlanguage")
    return ["de", "en", "es", "fr", "it", "ja", "pt"];
  return OPTIONS[command] ?? [];
}

export async function printCompletions(
  args: string[],
  context: CliContext,
): Promise<void> {
  for (const candidate of await completionCandidates(args[1], context)) {
    context.terminal.log(candidate);
  }
}
