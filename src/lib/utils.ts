import { join } from "node:path";
import type { CliContext } from "../core/contracts";

/**
 * Capitalize the first letter of a string.
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function toIdentifier(value: string): string {
  return value.replace(/[-_]+([A-Za-z0-9])/g, (_, character: string) =>
    character.toUpperCase(),
  );
}

export interface CNPConfig {
  useI18n?: boolean;
  importAlias?: string;
  [key: string]: any;
}

export function configuredAliasPrefix(config: CNPConfig): string {
  const alias = config.importAlias ?? "@/*";
  return alias.endsWith("/*") ? alias.slice(0, -2) : "@";
}

/**
 * Load CLI configuration from the project root.
 * Returns null if the configuration file is missing or invalid.
 */
export async function loadConfig(
  context: Pick<CliContext, "cwd" | "fs">,
): Promise<CNPConfig | null> {
  const configPath = join(context.cwd, "cnp.config.json");
  if (!context.fs.exists(configPath)) return null;
  try {
    const raw = await context.fs.readText(configPath);
    return JSON.parse(raw) as CNPConfig;
  } catch {
    return null;
  }
}

/**
 * Map a key to its corresponding file name for page/component templates.
 * @param key string
 * @returns file name string
 */
export function toFileName(key: string): string {
  switch (key) {
    case "layout":
      return "layout.tsx";
    case "page":
      return "page.tsx";
    case "loading":
      return "loading.tsx";
    case "not-found":
      return "not-found.tsx";
    case "error":
      return "error.tsx";
    case "global-error":
      return "global-error.tsx";
    case "route":
      return "route.ts";
    case "template":
      return "template.tsx";
    case "default":
      return "default.tsx";
    default:
      return `${key}.tsx`;
  }
}
