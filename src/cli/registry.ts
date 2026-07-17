import type { CommandHandler } from "../core/contracts";
import { addApi } from "../lib/addApi";
import { addComponent } from "../lib/addComponent";
import { addLanguage } from "../lib/addLanguage";
import { addLib } from "../lib/addLib";
import { addPage } from "../lib/addPage";
import { addText } from "../lib/addText";
import { rmPage } from "../lib/rmPage";

export function createCommandRegistry(): ReadonlyMap<string, CommandHandler> {
  return new Map<string, CommandHandler>([
    ["addcomponent", addComponent],
    ["addpage", addPage],
    ["addlib", addLib],
    ["addapi", addApi],
    ["addlanguage", addLanguage],
    ["addtext", addText],
    ["rmpage", rmPage],
  ]);
}
