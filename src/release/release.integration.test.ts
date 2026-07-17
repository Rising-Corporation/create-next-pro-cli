import { execFileSync } from "node:child_process";
import {
  chmod,
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";

import { describe, expect, test } from "vitest";

function run(cwd: string, command: string, args: string[], env = process.env) {
  return execFileSync(command, args, {
    cwd,
    env,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

describe("release transaction", () => {
  test("reserves a patch atomically and resumes it without incrementing", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "cnp-release-"));
    const repository = path.join(root, "repository");
    const remote = path.join(root, "remote.git");
    const bin = path.join(root, "bin");
    try {
      await mkdir(path.join(repository, "scripts"), { recursive: true });
      await mkdir(path.join(repository, "src", "release"), {
        recursive: true,
      });
      await mkdir(bin);
      await copyFile(
        "scripts/release.ts",
        path.join(repository, "scripts/release.ts"),
      );
      await copyFile(
        "src/release/model.ts",
        path.join(repository, "src/release/model.ts"),
      );
      await writeFile(
        path.join(repository, "package.json"),
        '{"name":"create-next-pro-cli","version":"0.1.26"}\n',
      );
      await writeFile(path.join(repository, "bun.lock"), "{}\n");
      await writeFile(path.join(repository, ".gitignore"), "node_modules\n");
      await writeFile(
        path.join(bin, "npm"),
        "#!/bin/sh\nprintf '\"0.1.26\"\\n'\n",
      );
      await writeFile(path.join(bin, "bun"), "#!/bin/sh\nexit 0\n");
      await chmod(path.join(bin, "npm"), 0o755);
      await chmod(path.join(bin, "bun"), 0o755);

      run(repository, "git", ["init", "-q", "-b", "master"]);
      run(repository, "git", ["config", "user.name", "test"]);
      run(repository, "git", ["config", "user.email", "test@example.com"]);
      run(repository, "git", ["add", "."]);
      run(repository, "git", ["commit", "-q", "-m", "feat: release fixture"]);
      const sourceSha = run(repository, "git", ["rev-parse", "HEAD"]);
      const env = {
        ...process.env,
        GITHUB_SHA: sourceSha,
        PATH: `${bin}:${process.env.PATH ?? ""}`,
      };

      const prepared = JSON.parse(
        run(
          repository,
          process.execPath,
          ["scripts/release.ts", "prepare"],
          env,
        ),
      ) as { action: string; targetVersion: string };
      expect(prepared).toMatchObject({
        action: "release",
        targetVersion: "0.1.27",
      });
      expect(
        JSON.parse(
          await readFile(path.join(repository, "package.json"), "utf8"),
        ),
      ).toMatchObject({ version: "0.1.27" });

      run(
        repository,
        process.execPath,
        ["scripts/release.ts", "commit", "0.1.27"],
        env,
      );
      run(root, "git", ["init", "-q", "--bare", remote]);
      run(repository, "git", ["remote", "add", "origin", remote]);
      run(repository, "git", [
        "push",
        "-q",
        "--atomic",
        "origin",
        "HEAD:master",
        "refs/tags/v0.1.27:refs/tags/v0.1.27",
      ]);

      const resumed = JSON.parse(
        run(
          repository,
          process.execPath,
          ["scripts/release.ts", "resume"],
          env,
        ),
      ) as { action: string; targetVersion: string };
      expect(resumed).toMatchObject({
        action: "resume",
        targetVersion: "0.1.27",
      });
      expect(run(repository, "git", ["tag", "--list"])).toBe("v0.1.27");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
