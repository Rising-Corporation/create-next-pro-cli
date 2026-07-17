import { existsSync } from "node:fs";
import { readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import type { PromptRunner, Terminal } from "../core/contracts";
import { CliError } from "../core/contracts";
import { discoverPages, type PageCandidate } from "../core/page-catalog";
import { parseLogicalName, resolveInside } from "../core/project-paths";

async function removeMessages(
  projectRoot: string,
  candidate: PageCandidate,
  terminal: Terminal,
) {
  const messagesRoot = resolveInside(projectRoot, "messages");
  let locales;
  try {
    locales = (await readdir(messagesRoot, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
  } catch {
    return;
  }
  for (const locale of locales) {
    const target = resolveInside(
      projectRoot,
      "messages",
      locale,
      `${candidate.routeSegments[0]}.json`,
    );
    if (!existsSync(target)) continue;
    if (candidate.messageKey) {
      const data = JSON.parse(await readFile(target, "utf8")) as Record<
        string,
        unknown
      >;
      delete data[candidate.messageKey];
      await writeFile(target, `${JSON.stringify(data, null, 2)}\n`);
    } else {
      await rm(target);
    }
    terminal.log(`🗑️ Deleted messages for ${candidate.logicalName}: ${target}`);
  }
}

export async function rmPage(
  args: string[],
  cwd = process.cwd(),
  prompt?: PromptRunner,
  terminal: Terminal = console,
): Promise<void> {
  const candidates = await discoverPages(cwd);
  let logicalName = args[1];
  if (!logicalName || logicalName.startsWith("-")) {
    if (!prompt)
      throw new CliError("A page name is required in non-interactive mode.");
    const selected = await prompt<"page" | "confirm">([
      {
        type: "autocomplete",
        name: "page",
        message: "🗑️ Page to remove:",
        choices: candidates.map((candidate) => ({
          title: candidate.logicalName.replaceAll(".", " › "),
          value: candidate.logicalName,
        })),
      },
      {
        type: (value: string) => (value ? "confirm" : null),
        name: "confirm",
        message: "Confirm page deletion?",
        initial: false,
      },
    ]);
    if (!selected.confirm) {
      terminal.log("Page deletion cancelled.");
      return;
    }
    logicalName = String(selected.page ?? "");
  }

  parseLogicalName(logicalName, "page name");
  const candidate = candidates.find(
    (entry) => entry.logicalName === logicalName,
  );
  if (!candidate) throw new CliError(`Page not found: ${logicalName}`);

  await removeMessages(cwd, candidate, terminal);
  for (const target of [candidate.uiDirectory, candidate.routeDirectory]) {
    const safeTarget = resolveInside(cwd, path.relative(cwd, target));
    if (existsSync(safeTarget)) {
      await rm(safeTarget, { recursive: true, force: false });
      terminal.log(`🗑️ Deleted: ${safeTarget}`);
    }
  }
  terminal.log(`✅ Page "${logicalName}" deleted.`);
}
