import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import process from "node:process";

import {
  decideRelease,
  type ReleaseDecision,
  type ReleaseState,
} from "../src/release/model";

type PackageManifest = { name: string; version: string };

function run(command: string, args: string[]): string {
  return execFileSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function git(args: string[]): string {
  return run("git", args);
}

function gitStatus(): string {
  return execFileSync("git", ["status", "--porcelain"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function readManifest(): PackageManifest {
  return JSON.parse(readFileSync("package.json", "utf8")) as PackageManifest;
}

function resolveTag(version: string): string | undefined {
  try {
    return git(["rev-list", "-n", "1", `refs/tags/v${version}`]);
  } catch {
    return undefined;
  }
}

function readNpmVersion(packageName: string): string {
  const registry = process.env.npm_config_registry;
  const args = ["view", packageName, "version", "--json"];
  if (registry) args.push("--registry", registry);
  const value = JSON.parse(run("npm", args)) as string;
  if (typeof value !== "string")
    throw new Error("npm returned no latest version");
  return value;
}

function inspectState(): { state: ReleaseState; decision: ReleaseDecision } {
  const manifest = readManifest();
  const headSha = git(["rev-parse", "HEAD"]);
  const sourceSha = process.env.GITHUB_SHA || headSha;
  const state: ReleaseState = {
    currentVersion: manifest.version,
    npmVersion: readNpmVersion(manifest.name),
    headSha,
    sourceSha,
    tagSha: resolveTag(manifest.version),
    headMessage: git(["log", "-1", "--pretty=%s"]),
  };
  return { state, decision: decideRelease(state) };
}

function print(decision: ReleaseDecision): void {
  process.stdout.write(`${JSON.stringify(decision)}\n`);
}

function assertClean(): void {
  if (gitStatus()) {
    throw new Error("release preparation requires a clean worktree");
  }
}

function updateVersion(targetVersion: string): void {
  const packageText = readFileSync("package.json", "utf8");
  const lockText = readFileSync("bun.lock", "utf8");
  try {
    const manifest = JSON.parse(packageText) as Record<string, unknown>;
    manifest.version = targetVersion;
    writeFileSync("package.json", `${JSON.stringify(manifest, null, 2)}\n`);
    run("bun", ["install", "--lockfile-only"]);
    const changed = git(["diff", "--name-only"]).split("\n").filter(Boolean);
    const unexpected = changed.filter(
      (path) => path !== "package.json" && path !== "bun.lock",
    );
    if (unexpected.length > 0) {
      throw new Error(
        `version preparation changed unexpected files: ${unexpected.join(", ")}`,
      );
    }
  } catch (error) {
    writeFileSync("package.json", packageText);
    writeFileSync("bun.lock", lockText);
    throw error;
  }
}

function commitRelease(version: string): void {
  const manifest = readManifest();
  if (manifest.version !== version) {
    throw new Error(
      `package version ${manifest.version} does not match ${version}`,
    );
  }
  const changed = gitStatus().split("\n").filter(Boolean);
  if (
    changed.length === 0 ||
    changed.some(
      (line) => !/^[ MARC?]{2} (package\.json|bun\.lock)$/.test(line),
    )
  ) {
    throw new Error(
      "only package.json and bun.lock may change before release commit",
    );
  }
  git(["add", "--", "package.json", "bun.lock"]);
  git(["commit", "--no-verify", "-m", `chore(release): v${version}`]);
  git(["tag", "-a", `v${version}`, "-m", `v${version}`]);
  print({
    action: "release",
    currentVersion: version,
    targetVersion: version,
    sourceSha: git(["rev-parse", "HEAD"]),
    reason: "Release commit and annotated tag created",
  });
}

function main(): void {
  const command = process.argv[2] ?? "check";
  if (command === "commit") {
    const version = process.argv[3];
    if (!version) throw new Error("release commit requires a version");
    commitRelease(version);
    return;
  }

  const { decision } = inspectState();
  if (decision.action === "error") {
    print(decision);
    process.exitCode = 1;
    return;
  }
  if (command === "check") {
    print(decision);
    return;
  }
  if (command === "prepare") {
    if (decision.action !== "release") {
      throw new Error(
        `cannot prepare a release from action ${decision.action}`,
      );
    }
    assertClean();
    updateVersion(decision.targetVersion);
    print(decision);
    return;
  }
  if (command === "resume") {
    if (decision.action !== "resume") {
      throw new Error(`cannot resume a release from action ${decision.action}`);
    }
    print(decision);
    return;
  }
  throw new Error(`unknown release command: ${command}`);
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(
    `${JSON.stringify({ action: "error", reason: message })}\n`,
  );
  process.exitCode = 1;
}
