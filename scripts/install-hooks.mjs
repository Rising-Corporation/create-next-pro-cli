import { existsSync } from "node:fs";
import process from "node:process";

if (
  process.env.HUSKY !== "0" &&
  process.env.NODE_ENV !== "production" &&
  existsSync(".git") &&
  existsSync("node_modules/husky")
) {
  const { default: husky } = await import("husky");
  husky();
}
