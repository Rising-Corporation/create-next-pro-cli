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

    const config = await onboarding(context, "1.2.3");
    expect(config.shell).toBe("bash");
    expect(config.completionInstalled).toBe(false);
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
});
