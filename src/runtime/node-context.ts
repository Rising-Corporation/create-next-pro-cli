import { existsSync } from "node:fs";
import {
  appendFile,
  copyFile,
  lstat,
  mkdir,
  readdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import prompts from "prompts";

import type { CliContext, PromptRunner } from "../core/contracts";
import { OperationJournal } from "../core/operations";

function findPackageRoot(start: string): string {
  let current = start;
  while (true) {
    const packagePath = path.join(current, "package.json");
    if (existsSync(packagePath)) return current;
    const parent = path.dirname(current);
    if (parent === current) {
      throw new Error(`Unable to locate package.json from ${start}`);
    }
    current = parent;
  }
}

export function resolvePackageRoot(metaUrl = import.meta.url): string {
  return findPackageRoot(path.dirname(fileURLToPath(metaUrl)));
}

type ContextOverrides = Partial<
  Pick<
    CliContext,
    | "argv"
    | "cwd"
    | "env"
    | "homeDir"
    | "packageRoot"
    | "terminal"
    | "prompt"
    | "fs"
    | "outputMode"
  >
>;

export function createNodeContext(
  overrides: ContextOverrides = {},
): CliContext {
  return {
    argv: process.argv.slice(2),
    cwd: process.cwd(),
    env: process.env,
    homeDir: os.homedir(),
    packageRoot: resolvePackageRoot(),
    terminal: console,
    prompt: prompts as PromptRunner,
    fs: {
      exists: existsSync,
      readText: (target) => readFile(target, "utf8"),
      writeText: async (target, content) => {
        await writeFile(target, content);
      },
      mkdir: async (target) => {
        await mkdir(target, { recursive: true });
      },
      copyFile: async (source, target) => {
        await copyFile(source, target);
      },
      appendText: async (target, content) => {
        await appendFile(target, content);
      },
      remove: async (target, options) => {
        await rm(target, options);
      },
      inspect: async (target) => {
        try {
          const stats = await lstat(target);
          return {
            name: target,
            isFile: stats.isFile(),
            isDirectory: stats.isDirectory(),
            isSymbolicLink: stats.isSymbolicLink(),
          };
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
          throw error;
        }
      },
      list: async (target) => {
        const entries = await readdir(target, { withFileTypes: true });
        return Promise.all(
          entries
            .sort((left, right) => left.name.localeCompare(right.name))
            .map(async (entry) => {
              const stats = await lstat(path.join(target, entry.name));
              return {
                name: entry.name,
                isFile: stats.isFile(),
                isDirectory: stats.isDirectory(),
                isSymbolicLink: stats.isSymbolicLink(),
              };
            }),
        );
      },
    },
    operations: new OperationJournal(),
    outputMode: "human",
    ...overrides,
  };
}
