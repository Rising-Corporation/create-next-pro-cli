import { spawn } from "node:child_process";

export const packageManagers = ["bun", "npm", "pnpm"] as const;

export type PackageManager = (typeof packageManagers)[number];

function isPackageManager(value: string): value is PackageManager {
  return packageManagers.includes(value as PackageManager);
}

export function resolvePackageManager(
  env: Readonly<Record<string, string | undefined>> = process.env,
): PackageManager {
  const explicit = env.CNP_PACKAGE_MANAGER?.trim();
  if (explicit) {
    if (isPackageManager(explicit)) return explicit;
    throw new Error(
      `Unsupported package manager "${explicit}". Expected bun, npm, or pnpm.`,
    );
  }

  const userAgent = env.npm_config_user_agent?.trim().split(/[\s/]/, 1)[0];
  if (userAgent && isPackageManager(userAgent)) return userAgent;

  throw new Error(
    "Unable to detect the package manager. Run the script through bun, npm, or pnpm, or set CNP_PACKAGE_MANAGER.",
  );
}

export function packageManagerExecutable(
  manager: PackageManager,
  platform: NodeJS.Platform = process.platform,
): string {
  return platform === "win32" && manager !== "bun" ? `${manager}.cmd` : manager;
}

export function installArguments(manager: PackageManager): string[] {
  if (manager === "bun") return ["install", "--frozen-lockfile"];
  if (manager === "pnpm") return ["install", "--no-frozen-lockfile"];
  return ["install"];
}

export function runPackageManager(
  manager: PackageManager,
  args: string[],
  options: { cwd?: string; env?: NodeJS.ProcessEnv } = {},
): Promise<void> {
  return new Promise((resolve, reject) => {
    const executable = packageManagerExecutable(manager);
    const child = spawn(executable, args, {
      cwd: options.cwd,
      env: options.env ?? process.env,
      shell: false,
      stdio: "inherit",
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) resolve();
      else {
        reject(
          new Error(
            `${manager} ${args.join(" ")} failed${signal ? ` with signal ${signal}` : ` with exit code ${code ?? "unknown"}`}.`,
          ),
        );
      }
    });
  });
}
