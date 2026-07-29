import { join } from "node:path";

import { CliError, type CommandHandler } from "../core/contracts";
import {
  type LibraryExportKind,
  type LibraryIndexPlan,
  planLibraryIndex,
} from "../core/library-index";
import { commandResult, MutationGateway } from "../core/operations";
import { assertSafeTarget, parseLogicalName } from "../core/project-paths";
import { capitalize, loadConfig, toIdentifier } from "./utils";

type MutationAction = "created" | "updated" | "unchanged";
type ExportAction = "added" | "preserved" | "not-applicable";

function errorCode(error: unknown): string | undefined {
  return typeof error === "object" && error !== null && "code" in error
    ? String(error.code)
    : undefined;
}

function concurrencyError(path: string): CliError {
  return new CliError("The library changed while addlib was running.", {
    code: "CONCURRENT_MODIFICATION",
    scope: "project",
    path,
    hint: "Wait for the other operation to finish, inspect the library, and retry.",
  });
}

async function releaseLock(
  release: () => Promise<void>,
  lockRelative: string,
): Promise<void> {
  try {
    await release();
  } catch (error) {
    throw new CliError("Unable to release the addlib lock.", {
      code: "FILESYSTEM_ERROR",
      scope: "project",
      path: lockRelative,
      hint: `Remove the stale lock after confirming no addlib process is running. ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

export const addLib: CommandHandler = async (args, context) => {
  let libArg = args[1];
  if (!libArg || libArg.startsWith("-")) {
    if (context.outputMode === "json") {
      throw new CliError("Library name is required in JSON mode.", {
        code: "INTERACTIVE_INPUT_REQUIRED",
        hint: "Pass library or library.module after addlib.",
      });
    }
    const response = await context.prompt<"libArg">({
      type: "text",
      name: "libArg",
      message: "Library name to add:",
      validate: (name: string) => (name ? true : "Library name is required"),
    });
    libArg = String(response.libArg ?? "");
    if (!libArg) {
      context.operations.record({
        action: "cancelled",
        resource: "command",
        role: "library-creation",
        scope: "project",
        path: ".",
      });
      return commandResult(context, {
        command: "addlib",
        summary: "Library creation was cancelled.",
        projectRoot: context.cwd,
        status: "cancelled",
      });
    }
  }

  const segments = parseLogicalName(libArg, "library name");
  if (segments.length > 2) {
    throw new CliError("Libraries support exactly library or library.module.", {
      code: "INVALID_ARGUMENT",
    });
  }
  const [libName, fileName] = segments;
  if (!(await loadConfig(context))) {
    throw new CliError("Configuration file cnp.config.json was not found.", {
      code: "CONFIG_NOT_FOUND",
      hint: "Run this command from the generated project root.",
    });
  }

  const libDir = join(context.cwd, "src", "lib", libName);
  const indexPath = join(libDir, "index.ts");
  const modulePath = fileName ? join(libDir, `${fileName}.ts`) : undefined;
  const lockRelative = `.create-next-pro-addlib-${libName}.lock`;
  const lockPath = join(context.cwd, lockRelative);
  await assertSafeTarget(context.cwd, libDir, context.fs);
  await assertSafeTarget(context.cwd, indexPath, context.fs);
  await assertSafeTarget(context.cwd, lockPath, context.fs);
  if (modulePath) await assertSafeTarget(context.cwd, modulePath, context.fs);

  const templateDir = join(context.packageRoot, "templates", "Lib");
  const indexTemplate = join(templateDir, "index.ts");
  const itemTemplate = join(templateDir, "item.ts");
  if (
    !context.fs.exists(indexTemplate) ||
    (fileName && !context.fs.exists(itemTemplate))
  ) {
    throw new CliError("Required library template files were not found.", {
      code: "TEMPLATE_MISSING",
      scope: "package",
      path: "templates/Lib",
    });
  }
  const templateIndexContent = await context.fs.readText(indexTemplate);
  const templateModuleContent = fileName
    ? (await context.fs.readText(itemTemplate))
        .replace(/template/g, toIdentifier(fileName))
        .replace(/Template/g, capitalize(toIdentifier(fileName)))
    : undefined;

  let release: () => Promise<void>;
  try {
    release = await context.fs.acquireLock(lockPath);
  } catch (error) {
    if (errorCode(error) === "EEXIST") throw concurrencyError(lockRelative);
    throw error;
  }

  const gateway = new MutationGateway(context, context.cwd);
  const libDirectoryExisted = context.fs.exists(libDir);
  const indexExisted = context.fs.exists(indexPath);
  const moduleExisted = modulePath ? context.fs.exists(modulePath) : false;
  const moduleIdentifier = fileName ? toIdentifier(fileName) : undefined;
  let indexContent: string;
  let moduleContent: string | undefined;
  let plan: LibraryIndexPlan | undefined;
  try {
    indexContent = indexExisted
      ? await context.fs.readText(indexPath)
      : templateIndexContent;
    moduleContent = modulePath
      ? moduleExisted
        ? await context.fs.readText(modulePath)
        : templateModuleContent!
      : undefined;
    if (fileName && moduleIdentifier && moduleContent) {
      plan = planLibraryIndex({
        indexContent,
        moduleContent,
        moduleSpecifier: `./${fileName}`,
        symbol: moduleIdentifier,
      });
      if (plan.action === "inconsistent") {
        throw new CliError(plan.message, {
          code: plan.code,
          scope: "project",
          path: plan.code.endsWith("INDEX")
            ? gateway.path(indexPath)
            : gateway.path(modulePath!),
          hint: plan.hint,
        });
      }
    }
  } catch (error) {
    await releaseLock(release, lockRelative);
    throw error;
  }

  let directoryCreated = false;
  let moduleCreated = false;
  let moduleAction: MutationAction | undefined;
  let indexAction: MutationAction = indexExisted ? "unchanged" : "created";
  const exportAction: ExportAction = !fileName
    ? "not-applicable"
    : plan?.action === "append"
      ? "added"
      : "preserved";
  const exportKind: LibraryExportKind | undefined =
    plan && plan.action !== "inconsistent" ? plan.exportKind : undefined;
  const preservedExportStatements =
    plan && plan.action !== "inconsistent" ? plan.preservedExportStatements : 0;
  let appendAttempted = false;

  try {
    if (!libDirectoryExisted) {
      await context.fs.mkdir(libDir);
      directoryCreated = true;
    }
    if (modulePath) {
      if (moduleExisted) {
        moduleAction = "unchanged";
      } else {
        await context.fs.writeTextExclusive(modulePath, moduleContent!);
        moduleCreated = true;
        moduleAction = "created";
      }
    }

    if (!indexExisted) {
      const content =
        plan?.action === "append"
          ? `${indexContent}${plan.suffix}`
          : indexContent;
      await context.fs.writeTextExclusive(indexPath, content);
      indexAction = "created";
    } else if (plan?.action === "append") {
      const latest = await context.fs.readText(indexPath);
      if (latest !== indexContent)
        throw concurrencyError(gateway.path(indexPath));
      appendAttempted = true;
      await context.fs.appendText(indexPath, plan.suffix);
      indexAction = "updated";
    }
  } catch (error) {
    const rollbackErrors: string[] = [];
    let existingIndexChanged = false;
    if (indexExisted && appendAttempted && context.fs.exists(indexPath)) {
      try {
        existingIndexChanged =
          (await context.fs.readText(indexPath)) !== indexContent;
        if (existingIndexChanged) {
          rollbackErrors.push(
            "index: append reported an error after changing the file",
          );
        }
      } catch (rollbackError) {
        rollbackErrors.push(
          `index inspection: ${rollbackError instanceof Error ? rollbackError.message : String(rollbackError)}`,
        );
      }
    }
    if (!indexExisted && context.fs.exists(indexPath)) {
      try {
        await context.fs.remove(indexPath, { force: true });
      } catch (rollbackError) {
        rollbackErrors.push(
          `index: ${rollbackError instanceof Error ? rollbackError.message : String(rollbackError)}`,
        );
      }
    }
    if (moduleCreated && modulePath && context.fs.exists(modulePath)) {
      try {
        await context.fs.remove(modulePath, { force: true });
        moduleCreated = false;
      } catch (rollbackError) {
        rollbackErrors.push(
          `module: ${rollbackError instanceof Error ? rollbackError.message : String(rollbackError)}`,
        );
      }
    }
    if (directoryCreated && context.fs.exists(libDir)) {
      try {
        const remaining = await context.fs.list(libDir);
        if (remaining.length === 0) {
          await context.fs.remove(libDir, { recursive: true });
          directoryCreated = false;
        } else {
          rollbackErrors.push(
            `directory: contains ${remaining.length} residual entries`,
          );
        }
      } catch (rollbackError) {
        rollbackErrors.push(
          `directory: ${rollbackError instanceof Error ? rollbackError.message : String(rollbackError)}`,
        );
      }
    }
    try {
      await releaseLock(release, lockRelative);
    } catch (rollbackError) {
      rollbackErrors.push(
        `lock: ${rollbackError instanceof Error ? rollbackError.message : String(rollbackError)}`,
      );
    }
    if (moduleCreated && modulePath) {
      gateway.committed("created", modulePath, {
        role: "library-module",
        detail: { rollbackFailed: true },
      });
    }
    if (!indexExisted && context.fs.exists(indexPath)) {
      gateway.committed("created", indexPath, {
        role: "library-index",
        detail: { rollbackFailed: true },
      });
    }
    if (existingIndexChanged) {
      gateway.committed("updated", indexPath, {
        role: "library-index",
        detail: { rollbackFailed: true },
      });
    }
    if (directoryCreated) {
      gateway.committed("created", libDir, {
        role: "library-directory",
        resource: "directory",
        detail: { rollbackFailed: true },
      });
    }
    if (rollbackErrors.length > 0) {
      throw new CliError("addlib failed and rollback was incomplete.", {
        code: "FILESYSTEM_ERROR",
        scope: "project",
        path: gateway.path(libDir),
        hint: `${error instanceof Error ? error.message : String(error)} Rollback: ${rollbackErrors.join("; ")}`,
      });
    }
    if (errorCode(error) === "EEXIST") {
      const target =
        typeof error === "object" &&
        error !== null &&
        "path" in error &&
        typeof error.path === "string"
          ? gateway.path(error.path)
          : gateway.path(indexPath);
      throw concurrencyError(target);
    }
    throw error;
  }

  try {
    await releaseLock(release, lockRelative);
  } catch (error) {
    if (directoryCreated) {
      gateway.committed("created", libDir, {
        role: "library-directory",
        resource: "directory",
      });
    }
    if (modulePath && moduleAction) {
      gateway.committed(moduleAction, modulePath, { role: "library-module" });
    }
    gateway.committed(indexAction, indexPath, { role: "library-index" });
    throw error;
  }

  gateway.committed(directoryCreated ? "created" : "unchanged", libDir, {
    role: "library-directory",
    resource: "directory",
  });
  if (modulePath && moduleAction) {
    gateway.committed(moduleAction, modulePath, {
      role: "library-module",
      detail: { module: fileName!, moduleIdentifier: moduleIdentifier! },
    });
  }
  gateway.committed(indexAction, indexPath, {
    role: "library-index",
    detail: {
      exportAction,
      exportKind: exportKind ?? "none",
      module: fileName ?? null,
      preservedExportStatements,
    },
  });

  const mutated = [
    moduleAction,
    indexAction,
    directoryCreated ? "created" : "unchanged",
  ].some((action) => action === "created" || action === "updated");
  const nextSteps = [];
  if (fileName && moduleAction === "created") {
    nextSteps.push({
      kind: "review" as const,
      required: true,
      message: "Implement and review the generated library module.",
      paths: [{ scope: "project" as const, path: gateway.path(modulePath!) }],
    });
  }
  if (mutated) {
    nextSteps.push({
      kind: "run-checks" as const,
      required: true,
      message: "Run the project checks.",
      paths: [],
      commands: ["bun run check", "npm run check", "pnpm run check"],
    });
  }

  return commandResult(context, {
    command: "addlib",
    summary: mutated
      ? fileName
        ? `Added module "${fileName}" to library "${libName}" and preserved ${preservedExportStatements} existing export statements.`
        : `Added library "${libName}".`
      : fileName
        ? `Module "${fileName}" is already publicly exported by library "${libName}".`
        : `Library "${libName}" already exists and was preserved.`,
    projectRoot: context.cwd,
    nextSteps,
    data: {
      library: libName,
      module: fileName ?? null,
      moduleAction: moduleAction ?? "not-applicable",
      indexAction,
      exportAction,
      exportKind: exportKind ?? null,
      preservedExportStatements,
    },
  });
};
