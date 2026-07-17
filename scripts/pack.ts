import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import process from "node:process";

const output = process.argv[2];
if (!output) throw new Error("package pack requires an output JSON path");

const packagePath = "package.json";
const original = readFileSync(packagePath, "utf8");

try {
  const manifest = JSON.parse(original) as {
    scripts?: Record<string, string>;
  };
  if (manifest.scripts) delete manifest.scripts.prepare;
  writeFileSync(packagePath, `${JSON.stringify(manifest, null, 2)}\n`);
  const result = execFileSync("npm", ["pack", "--json", "--silent"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  writeFileSync(output, result);
} finally {
  writeFileSync(packagePath, original);
}
