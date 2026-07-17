import { readdir } from "node:fs/promises";
import path from "node:path";

export type PageCandidate = {
  logicalName: string;
  routeSegments: string[];
  routeDirectory: string;
  uiDirectory: string;
  messageFile: string;
  messageKey?: string;
};

function isRouteGroup(segment: string): boolean {
  return segment.startsWith("(") && segment.endsWith(")");
}

export async function discoverPages(
  projectRoot: string,
): Promise<PageCandidate[]> {
  const appRoot = path.join(projectRoot, "src", "app", "[locale]");
  const candidates: PageCandidate[] = [];

  async function visit(directory: string, relative: string[] = []) {
    let entries;
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch {
      return;
    }
    if (entries.some((entry) => entry.isFile() && entry.name === "page.tsx")) {
      const routeSegments = relative.filter(
        (segment) => !isRouteGroup(segment),
      );
      if (
        routeSegments.length > 0 &&
        !routeSegments.some(
          (segment) => segment.startsWith("_") || segment.startsWith("["),
        )
      ) {
        const logicalName = routeSegments.join(".");
        candidates.push({
          logicalName,
          routeSegments,
          routeDirectory: directory,
          uiDirectory: path.join(projectRoot, "src", "ui", ...routeSegments),
          messageFile: path.join(
            projectRoot,
            "messages",
            "{locale}",
            `${routeSegments[0]}.json`,
          ),
          messageKey:
            routeSegments.length > 1 ? routeSegments.at(-1) : undefined,
        });
      }
    }
    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith(".")) {
        await visit(path.join(directory, entry.name), [
          ...relative,
          entry.name,
        ]);
      }
    }
  }

  await visit(appRoot);
  return candidates.sort((left, right) =>
    left.logicalName.localeCompare(right.logicalName),
  );
}
