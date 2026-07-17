import path from "node:path";
import { lstat } from "node:fs/promises";

import { CliError } from "./contracts";

const SAFE_SEGMENT = /^[A-Za-z][A-Za-z0-9_-]*$/;

function hasControlCharacters(value: string): boolean {
  return [...value].some((character) => {
    const code = character.charCodeAt(0);
    return code <= 31 || code === 127;
  });
}

export function parseLogicalName(value: string, label = "name"): string[] {
  if (!value || hasControlCharacters(value)) {
    throw new CliError(
      `Invalid ${label}: a non-empty printable value is required.`,
    );
  }
  if (path.isAbsolute(value) || value.includes("/") || value.includes("\\")) {
    throw new CliError(
      `Invalid ${label}: paths and separators are not allowed.`,
    );
  }
  const segments = value.split(".");
  if (segments.some((segment) => !SAFE_SEGMENT.test(segment))) {
    throw new CliError(
      `Invalid ${label}: use dot-separated alphanumeric segments beginning with a letter.`,
    );
  }
  return segments;
}

export function validateProjectName(value: string): string {
  if (
    !value ||
    hasControlCharacters(value) ||
    path.isAbsolute(value) ||
    value === "." ||
    value === ".." ||
    value.includes("/") ||
    value.includes("\\") ||
    !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value)
  ) {
    throw new CliError(
      "Invalid project name: use letters, numbers, dots, dashes or underscores without path separators.",
    );
  }
  return value;
}

export function resolveInside(root: string, ...segments: string[]): string {
  const absoluteRoot = path.resolve(root);
  const target = path.resolve(absoluteRoot, ...segments);
  if (
    target !== absoluteRoot &&
    !target.startsWith(`${absoluteRoot}${path.sep}`)
  ) {
    throw new CliError(
      `Refusing to access a path outside the project: ${target}`,
    );
  }
  return target;
}

export async function assertSafeTarget(
  root: string,
  target: string,
): Promise<string> {
  const safeTarget = resolveInside(root, path.relative(root, target));
  const relativeSegments = path
    .relative(path.resolve(root), safeTarget)
    .split(path.sep);
  let current = path.resolve(root);
  for (const segment of relativeSegments) {
    if (!segment) continue;
    current = path.join(current, segment);
    try {
      if ((await lstat(current)).isSymbolicLink()) {
        throw new CliError(
          `Symbolic links are forbidden in project paths: ${current}`,
        );
      }
    } catch (error) {
      if (error instanceof CliError) throw error;
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  return safeTarget;
}

export function normalizeImportAlias(value: string): string {
  if (!/^[A-Za-z@~][A-Za-z0-9@~_-]*\/\*$/.test(value)) {
    throw new CliError(
      'Invalid import alias: expected a prefix followed by "/*" (for example "@/*" or "@core/*").',
    );
  }
  return value;
}

export function importAliasPrefix(value = "@/*"): string {
  return normalizeImportAlias(value).slice(0, -2);
}
