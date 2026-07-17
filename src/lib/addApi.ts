import { join } from "node:path";

import { loadConfig } from "./utils";
import { assertSafeTarget, parseLogicalName } from "../core/project-paths";
import { CliError, type CommandHandler } from "../core/contracts";
import { commandResult, MutationGateway } from "../core/operations";

export const addApi: CommandHandler = async (args, context) => {
  let apiName = args[1];
  if (!apiName || apiName.startsWith("-")) {
    if (context.outputMode === "json") {
      throw new CliError("API route name is required in JSON mode.", {
        code: "INTERACTIVE_INPUT_REQUIRED",
        hint: "Pass the API route name after addapi.",
      });
    }
    const response = await context.prompt<"apiName">({
      type: "text",
      name: "apiName",
      message: "API route name to add:",
      validate: (name: string) => (name ? true : "API route name is required"),
    });
    apiName = String(response.apiName ?? "");
    if (!apiName) {
      context.operations.record({
        action: "cancelled",
        resource: "command",
        role: "api-creation",
        scope: "project",
        path: ".",
      });
      return commandResult(context, {
        command: "addapi",
        summary: "API route creation was cancelled.",
        projectRoot: context.cwd,
        status: "cancelled",
      });
    }
  }
  const apiSegments = parseLogicalName(apiName, "API route name");

  const config = await loadConfig(context);
  if (!config) {
    throw new CliError("Configuration file cnp.config.json was not found.", {
      code: "CONFIG_NOT_FOUND",
      hint: "Run this command from the generated project root.",
    });
  }

  const apiDir = join(context.cwd, "src", "app", "api", ...apiSegments);
  await assertSafeTarget(context.cwd, apiDir, context.fs);
  const gateway = new MutationGateway(context, context.cwd);

  const templateDir = join(context.packageRoot, "templates", "Api");
  const routeTemplate = join(templateDir, "route.ts");
  const routePath = join(apiDir, "route.ts");
  if (!context.fs.exists(routeTemplate)) {
    throw new CliError("API template route.ts was not found.", {
      code: "TEMPLATE_MISSING",
      scope: "package",
      path: "templates/Api/route.ts",
    });
  }

  await gateway.mkdir(apiDir, {
    role: "api-directory",
    resource: "directory",
  });
  const content = (await context.fs.readText(routeTemplate)).replace(
    /template/g,
    apiName,
  );
  const action = await gateway.write(routePath, content, {
    role: "api-route",
    preserveExisting: true,
  });

  return commandResult(context, {
    command: "addapi",
    summary:
      action === "unchanged"
        ? `API route "${apiName}" already exists and was preserved.`
        : `Added API route "${apiName}".`,
    projectRoot: context.cwd,
    nextSteps:
      action === "unchanged"
        ? []
        : [
            {
              kind: "review",
              required: true,
              message:
                "Replace the example response and review validation and authentication.",
              paths: [{ scope: "project", path: gateway.path(routePath) }],
            },
            {
              kind: "run-checks",
              required: true,
              message: "Run the project checks.",
              paths: [],
              commands: ["bun run check", "npm run check", "pnpm run check"],
            },
          ],
  });
};
