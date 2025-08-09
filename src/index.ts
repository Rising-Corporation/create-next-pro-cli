// src/index.ts

import { addComponent } from "./lib/addComponent";
import { addPage } from "./lib/addPage";
import { rmPage } from "./lib/rmPage";
import { createProject } from "./lib/createProject";
import { createProjectWithPrompt } from "./lib/createProjectWithPrompt";

/**
 * Main CLI entry point for create-next-pro.
 *
 * Note: For now, the project behaves as if --force is always enabled and no creation prompt is taken into account.
 * All actions are performed directly without confirmation.
 */
export async function main() {
  console.log("🚀 Welcome to create-next-pro\n");

  let args = Bun.argv.slice(2);
  const force = args.includes("--force");
  // For now, --force is always considered enabled but do not overwrite existing projects
  // WARNING: if you enable --force it will overwrite existing projects. This is a temporary setting for development purposes.
  // const force = true;

  // If addpage is called without options, add default flags -LPl
  if (args[0] === "addpage" && args.length === 1) {
    args.push("-LPl");
  }

  /**
   * Handle addcomponent command: create a component in the correct location and update translation JSON.
   */
  if (args[0] === "addcomponent") {
    addComponent(args);
    return;
  }

  /**
   * Handle addpage command: create a page (nested or not) and update translation JSON.
   */
  if (args[0] === "addpage") {
    addPage(args);
    return;
  }

  /**
   * Handle rmpage command: remove a page and all related files/folders.
   */
  if (args[0] === "rmpage") {
    rmPage(args);
    return;
  }

  /**
   * Handle direct project creation if a name argument is provided.
   */
  const nameArg = args.find((arg) => !arg.startsWith("--"));

  if (nameArg) {
    createProject(nameArg, force);
    return;
  }

  /**
   * Interactive prompt for project creation (not currently used, see note above).
   */
  await createProjectWithPrompt();
}
