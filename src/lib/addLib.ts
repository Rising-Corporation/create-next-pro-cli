import { join } from "node:path";

import { CliError, type CommandHandler } from "../core/contracts";
import { commandResult, MutationGateway } from "../core/operations";
import { assertSafeTarget, parseLogicalName } from "../core/project-paths";
import { capitalize, loadConfig, toIdentifier } from "./utils";

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
  await assertSafeTarget(context.cwd, libDir, context.fs);
  const gateway = new MutationGateway(context, context.cwd);
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

  await gateway.mkdir(libDir, {
    role: "library-directory",
    resource: "directory",
  });
  const indexPath = join(libDir, "index.ts");
  if (!context.fs.exists(indexPath)) {
    await gateway.write(indexPath, await context.fs.readText(indexTemplate), {
      role: "library-index",
    });
  }

  let moduleAction: "created" | "updated" | "unchanged" | undefined;
  if (fileName) {
    const moduleIdentifier = toIdentifier(fileName);
    const modulePath = join(libDir, `${fileName}.ts`);
    const moduleContent = (await context.fs.readText(itemTemplate))
      .replace(/template/g, moduleIdentifier)
      .replace(/Template/g, capitalize(moduleIdentifier));
    moduleAction = await gateway.write(modulePath, moduleContent, {
      role: "library-module",
      preserveExisting: true,
    });

    const currentIndex = await context.fs.readText(indexPath);
    const importLine = `import { ${moduleIdentifier} } from "./${fileName}";`;
    const importRegex = new RegExp(
      `import\\s*{\\s*${moduleIdentifier}\\s*}\\s*from\\s*["']\\./${fileName}["'];`,
    );
    const exportRegex = /export\s*{([^}]*)}/m;
    const imports = currentIndex
      .split("\n")
      .filter((line) => line.startsWith("import"));
    const exportMatch = currentIndex.match(exportRegex);
    const exportsSet = (exportMatch?.[1] ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    if (!imports.some((line) => importRegex.test(line)))
      imports.push(importLine);
    if (!exportsSet.includes(moduleIdentifier))
      exportsSet.push(moduleIdentifier);
    const nextIndex = `${imports.join("\n")}\n\nexport { ${exportsSet.join(", ")} };\n`;
    await gateway.write(indexPath, nextIndex, { role: "library-index" });
  } else if (context.fs.exists(indexPath)) {
    gateway.unchanged(indexPath, { role: "library-index" });
  }

  const mutated = context.operations
    .snapshot()
    .some((event) =>
      ["created", "updated", "copied", "deleted"].includes(event.action),
    );
  const nextSteps = [];
  if (fileName && moduleAction !== "unchanged") {
    nextSteps.push({
      kind: "review" as const,
      required: true,
      message: "Implement and review the generated library module.",
      paths: [
        {
          scope: "project" as const,
          path: gateway.path(join(libDir, `${fileName}.ts`)),
        },
      ],
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
      ? `Added library "${libName}"${fileName ? ` with module "${fileName}"` : ""}.`
      : `Library "${libName}"${fileName ? ` and module "${fileName}"` : ""} already exist and were preserved.`,
    projectRoot: context.cwd,
    nextSteps,
  });
};
