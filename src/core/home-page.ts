import { join } from "node:path";

import { CliError, type CliContext } from "./contracts";
import type { PageArea } from "./page-area";
import { assertSafeTarget, parseLogicalName } from "./project-paths";

export const HOME_PAGE_NAME = "_home";

export function parseTranslationPath(value: string): string[] {
  const prefix = `${HOME_PAGE_NAME}.`;
  if (value.startsWith(prefix)) {
    return [
      HOME_PAGE_NAME,
      ...parseLogicalName(value.slice(prefix.length), "translation path"),
    ];
  }
  return parseLogicalName(value, "translation path");
}

export async function assertHomeComponentScope(
  context: Pick<CliContext, "cwd" | "fs">,
  area: PageArea,
): Promise<void> {
  if (area !== "public") {
    throw new CliError("The built-in _home page belongs to the public area.", {
      code: "TARGET_NOT_FOUND",
      scope: "project",
      path: HOME_PAGE_NAME,
      hint: "Use --page _home --area public.",
    });
  }

  const localizedRoot = join(context.cwd, "src", "app", "[locale]");
  const appRoot = context.fs.exists(localizedRoot)
    ? "src/app/[locale]"
    : "src/app";
  for (const relative of [
    `${appRoot}/page.tsx`,
    `${appRoot}/(public)/${HOME_PAGE_NAME}/page.tsx`,
    `src/ui/${HOME_PAGE_NAME}`,
  ]) {
    const target = join(context.cwd, relative);
    await assertSafeTarget(context.cwd, target, context.fs);
    const entry = await context.fs.inspect(target);
    const exists = relative.endsWith(".tsx")
      ? entry?.isFile
      : entry?.isDirectory;
    if (!exists) {
      throw new CliError("The built-in _home page structure was not found.", {
        code: "TARGET_NOT_FOUND",
        scope: "project",
        path: relative,
      });
    }
  }
}
