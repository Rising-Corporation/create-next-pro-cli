import { cp, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  installArguments,
  resolvePackageManager,
  runPackageManager,
} from "../../scripts/package-manager.ts";

const root = process.cwd();
const target = await mkdtemp(
  path.join(tmpdir(), "create-next-pro-template-consumer-"),
);
const manager = resolvePackageManager();
const gitignoreSource = await stat(path.join(root, ".gitignore.template")).then(
  () => ".gitignore.template",
  () => ".gitignore",
);
const entries = [
  [".agents", ".agents"],
  [".env.example", ".env.example"],
  [gitignoreSource, ".gitignore"],
  [".prettierignore", ".prettierignore"],
  ["AGENTS.md", "AGENTS.md"],
  ["README.md", "README.md"],
  ["bun.lock", "bun.lock"],
  ["eslint.config.mjs", "eslint.config.mjs"],
  ["messages", "messages"],
  ["next.config.ts", "next.config.ts"],
  ["package.json", "package.json"],
  ["playwright.config.ts", "playwright.config.ts"],
  ["pnpm-workspace.yaml", "pnpm-workspace.yaml"],
  ["postcss.config.mjs", "postcss.config.mjs"],
  ["public", "public"],
  ["scripts", "scripts"],
  ["src", "src"],
  ["tailwind.config.ts", "tailwind.config.ts"],
  ["tests", "tests"],
  ["tsconfig.json", "tsconfig.json"],
  ["vitest.config.ts", "vitest.config.ts"],
] as const;

try {
  for (const [source, destination] of entries) {
    await cp(path.join(root, source), path.join(target, destination), {
      recursive: true,
    });
  }

  if (manager !== "bun") {
    const packagePath = path.join(target, "package.json");
    const manifest = JSON.parse(await readFile(packagePath, "utf8")) as Record<
      string,
      unknown
    >;
    delete manifest.packageManager;
    await writeFile(packagePath, `${JSON.stringify(manifest, null, 2)}\n`);
  }

  const environment = {
    ...process.env,
    AUTH_DISABLED: "true",
    CI: "true",
    CNP_PACKAGE_MANAGER: manager,
  };
  await runPackageManager(manager, installArguments(manager), {
    cwd: target,
    env: environment,
  });
  await runPackageManager(manager, ["run", "check"], {
    cwd: target,
    env: environment,
  });
  await stat(path.join(target, "next-env.d.ts"));
} finally {
  await rm(target, { recursive: true, force: true });
}
