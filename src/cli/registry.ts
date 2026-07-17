import type { CommandHandler } from "../core/contracts";
import { success } from "../core/contracts";
import { addApi } from "../lib/addApi";
import { addComponent } from "../lib/addComponent";
import { addLanguage } from "../lib/addLanguage";
import { addLib } from "../lib/addLib";
import { addPage } from "../lib/addPage";
import { addText } from "../lib/addText";
import { rmPage } from "../lib/rmPage";

function legacyHandler(
  command: (args: string[], cwd?: string) => Promise<void>,
): CommandHandler {
  return async (args, context) => {
    await command(args, context.cwd);
    return success();
  };
}

export function createCommandRegistry(): ReadonlyMap<string, CommandHandler> {
  return new Map<string, CommandHandler>([
    ["addcomponent", legacyHandler(addComponent)],
    ["addpage", legacyHandler(addPage)],
    ["addlib", legacyHandler(addLib)],
    ["addapi", legacyHandler(addApi)],
    ["addlanguage", legacyHandler(addLanguage)],
    ["addtext", legacyHandler(addText)],
    [
      "rmpage",
      async (args, context) => {
        await rmPage(args, context.cwd, context.prompt, context.terminal);
        return success();
      },
    ],
  ]);
}
