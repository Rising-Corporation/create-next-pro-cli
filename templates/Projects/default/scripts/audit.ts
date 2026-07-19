import { resolvePackageManager, runPackageManager } from "./package-manager.ts";

const manager = resolvePackageManager();
await runPackageManager(manager, ["audit"]);
