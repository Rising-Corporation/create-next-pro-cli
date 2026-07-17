import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, test, vi } from "vitest";

import { configFile, onboarding, readConfig } from "./onboarding";
import type { PromptRunner } from "../core/contracts";
import { createNodeContext } from "../runtime/node-context";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("onboarding", () => {
  test("stores configuration under XDG_CONFIG_HOME", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "cnp-onboarding-"));
    temporaryDirectories.push(root);
    const context = createNodeContext({
      env: { XDG_CONFIG_HOME: root, SHELL: "/bin/bash" },
      homeDir: root,
      terminal: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
      prompt: vi.fn(async () => ({
        shell: "bash",
        completion: false,
      })) as PromptRunner,
    });

    const result = await onboarding(context, "1.2.3");
    const config = await readConfig(context);
    expect(result.status).toBe("success");
    expect(config).not.toBeNull();
    expect(config?.shell).toBe("bash");
    expect(config?.completionInstalled).toBe(false);
    expect(JSON.parse(await readFile(configFile(context), "utf8"))).toEqual(
      config,
    );
    await expect(readConfig(context)).resolves.toEqual(config);
  });

  test("returns null for a missing or invalid configuration", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "cnp-config-"));
    temporaryDirectories.push(root);
    const context = createNodeContext({
      env: { XDG_CONFIG_HOME: root },
      homeDir: root,
    });
    await expect(readConfig(context)).resolves.toBeNull();
  });

  test.each([
    ["zsh" as const, ".zshrc", "completion.zsh", "compdef _create_next_pro"],
    ["bash" as const, ".bashrc", "completion.sh", "complete -F"],
  ])(
    "installs %s completion idempotently",
    async (shell, rcName, completionName, marker) => {
      const root = await mkdtemp(path.join(tmpdir(), "cnp-completion-"));
      temporaryDirectories.push(root);
      const context = createNodeContext({
        env: { XDG_CONFIG_HOME: root, SHELL: `/bin/${shell}` },
        homeDir: root,
        terminal: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
        prompt: vi.fn(async () => ({
          shell,
          completion: true,
        })) as PromptRunner,
      });

      await onboarding(context, "1.2.3");
      await onboarding(context, "1.2.3");

      expect(
        await readFile(
          path.join(root, "create-next-pro", completionName),
          "utf8",
        ),
      ).toContain(marker);
      const rc = await readFile(path.join(root, rcName), "utf8");
      expect(rc.match(/source /g)).toHaveLength(1);
    },
  );
});
