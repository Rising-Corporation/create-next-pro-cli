import path from "node:path";

import { CliError, type CliFileSystem } from "./contracts";
import { isPageArea, type PageArea } from "./page-area";

export type PageCandidate = {
  id: `${PageArea}:${string}`;
  area: PageArea;
  logicalName: string;
  routeSegments: string[];
  routeDirectory: string;
  uiDirectory: string;
  messageFile: string;
  messageKey?: string;
};

export type PageCatalogIssue = {
  logicalName: string;
  reason: "ungrouped" | "unsupported-route-group" | "duplicate-logical-route";
  routeDirectories: string[];
};

export type PageCatalog = {
  candidates: PageCandidate[];
  issues: PageCatalogIssue[];
};

function isRouteGroup(segment: string): boolean {
  return segment.startsWith("(") && segment.endsWith(")");
}

function logicalSegments(relative: string[]): string[] {
  return relative.filter((segment) => !isRouteGroup(segment));
}

function issueForRoute(
  projectRoot: string,
  directory: string,
  relative: string[],
): PageCatalogIssue | undefined {
  const segments = logicalSegments(relative);
  if (
    segments.length === 0 ||
    segments.some(
      (segment) => segment.startsWith("_") || segment.startsWith("["),
    )
  ) {
    return undefined;
  }
  const first = relative[0];
  if (!first || !isRouteGroup(first)) {
    return {
      logicalName: segments.join("."),
      reason: "ungrouped",
      routeDirectories: [path.relative(projectRoot, directory)],
    };
  }
  const groupName = first.slice(1, -1);
  if (!isPageArea(groupName) || relative.slice(1).some(isRouteGroup)) {
    return {
      logicalName: segments.join("."),
      reason: "unsupported-route-group",
      routeDirectories: [path.relative(projectRoot, directory)],
    };
  }
  return undefined;
}

export async function discoverPageCatalog(
  projectRoot: string,
  fs: CliFileSystem,
): Promise<PageCatalog> {
  const localizedRoot = path.join(projectRoot, "src", "app", "[locale]");
  const appRoot = fs.exists(localizedRoot)
    ? localizedRoot
    : path.join(projectRoot, "src", "app");
  const rawCandidates: PageCandidate[] = [];
  const issues: PageCatalogIssue[] = [];

  async function visit(directory: string, relative: string[] = []) {
    let entries;
    try {
      entries = await fs.list(directory);
    } catch {
      return;
    }
    if (entries.some((entry) => entry.isFile && entry.name === "page.tsx")) {
      const issue = issueForRoute(projectRoot, directory, relative);
      if (issue) {
        issues.push(issue);
      } else if (relative.length > 1) {
        const area = relative[0].slice(1, -1) as PageArea;
        const routeSegments = relative.slice(1);
        if (
          routeSegments.length > 0 &&
          !routeSegments.some(
            (segment) => segment.startsWith("_") || segment.startsWith("["),
          )
        ) {
          const logicalName = routeSegments.join(".");
          rawCandidates.push({
            id: `${area}:${logicalName}`,
            area,
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
    }
    for (const entry of entries) {
      if (entry.isDirectory && !entry.name.startsWith(".")) {
        await visit(path.join(directory, entry.name), [
          ...relative,
          entry.name,
        ]);
      }
    }
  }

  await visit(appRoot);

  const candidatesByName = new Map<string, PageCandidate[]>();
  for (const candidate of rawCandidates) {
    const entries = candidatesByName.get(candidate.logicalName) ?? [];
    entries.push(candidate);
    candidatesByName.set(candidate.logicalName, entries);
  }
  for (const [logicalName, candidates] of candidatesByName) {
    if (candidates.length < 2) continue;
    issues.push({
      logicalName,
      reason: "duplicate-logical-route",
      routeDirectories: candidates.map((candidate) =>
        path.relative(projectRoot, candidate.routeDirectory),
      ),
    });
  }

  const invalidNames = new Set(issues.map((issue) => issue.logicalName));
  const candidates = rawCandidates
    .filter((candidate) => !invalidNames.has(candidate.logicalName))
    .sort(
      (left, right) =>
        left.area.localeCompare(right.area) ||
        left.logicalName.localeCompare(right.logicalName),
    );
  issues.sort((left, right) =>
    left.logicalName.localeCompare(right.logicalName),
  );
  return { candidates, issues };
}

export function routeIssue(
  catalog: PageCatalog,
  logicalName: string,
): PageCatalogIssue | undefined {
  return catalog.issues.find((issue) => issue.logicalName === logicalName);
}

export function assertConsistentLogicalRoute(
  catalog: PageCatalog,
  logicalName: string,
): void {
  const issue = routeIssue(catalog, logicalName);
  if (!issue) return;
  throw new CliError(`Page route "${logicalName}" is inconsistent.`, {
    code: "INCONSISTENT_ROUTE",
    scope: "project",
    path: issue.routeDirectories.join(", "),
    hint: "Move the route into exactly one of the (public) or (user) areas before retrying.",
  });
}

export function resolvePageCandidate(
  catalog: PageCatalog,
  logicalName: string,
  area: PageArea,
): PageCandidate {
  assertConsistentLogicalRoute(catalog, logicalName);
  const candidate = catalog.candidates.find(
    (entry) => entry.logicalName === logicalName && entry.area === area,
  );
  if (candidate) return candidate;
  const otherArea = catalog.candidates.find(
    (entry) => entry.logicalName === logicalName,
  );
  throw new CliError(`Page not found in the ${area} area: ${logicalName}.`, {
    code: "TARGET_NOT_FOUND",
    scope: "project",
    path: logicalName.replaceAll(".", "/"),
    hint: otherArea
      ? `The page exists in the ${otherArea.area} area.`
      : undefined,
  });
}
