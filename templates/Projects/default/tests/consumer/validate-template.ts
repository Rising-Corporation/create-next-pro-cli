import { spawn } from "node:child_process";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const root = process.cwd();
const target = await mkdtemp(path.join(tmpdir(), "create-next-pro-template-"));
const manager = process.env.CNP_PACKAGE_MANAGER ?? "bun";
const entries = [
  ".env.example",
  ".gitignore",
  ".prettierignore",
  "README.md",
  "bun.lock",
  "eslint.config.mjs",
  "messages",
  "next-env.d.ts",
  "next.config.ts",
  "package.json",
  "playwright.config.ts",
  "pnpm-workspace.yaml",
  "postcss.config.mjs",
  "public",
  "src",
  "tailwind.config.ts",
  "tests/unit",
  "tests/rendering",
  "tsconfig.json",
];

function run(command: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: target,
      env: { ...process.env, AUTH_DISABLED: "true", CI: "true" },
      stdio: "inherit",
    });
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`${command} ${args.join(" ")} failed`)),
    );
  });
}

try {
  for (const entry of entries) {
    await cp(path.join(root, entry), path.join(target, entry), {
      recursive: true,
    });
  }
  if (manager !== "bun") {
    const packagePath = path.join(target, "package.json");
    const manifest = JSON.parse(await readFile(packagePath, "utf8"));
    delete manifest.packageManager;
    await writeFile(packagePath, `${JSON.stringify(manifest, null, 2)}\n`);
  }
  await run(
    manager,
    manager === "bun" ? ["install", "--frozen-lockfile"] : ["install"],
  );
  await run(manager, ["run", "check"]);
} finally {
  await rm(target, { recursive: true, force: true });
}
