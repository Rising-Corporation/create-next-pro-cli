import { describe, expect, test, vi } from "vitest";

import type { CliContext } from "./core/contracts";
import { HELP_TEXT, main, parseOptions } from "./index";

function context(argv: string[]): {
  context: CliContext;
  log: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
} {
  const log = vi.fn();
  const error = vi.fn();
  return {
    log,
    error,
    context: {
      argv,
      cwd: "/tmp/project",
      env: {},
      homeDir: "/tmp/home",
      packageRoot: "/package",
      terminal: { log, warn: vi.fn(), error },
      prompt: vi.fn(),
      fs: {
        exists: vi.fn(() => true),
        readText: vi.fn(async (target: string) => {
          if (target.endsWith("package.json")) return '{"version":"1.2.3"}';
          return "{}";
        }),
        writeText: vi.fn(async () => undefined),
        mkdir: vi.fn(async () => undefined),
        copyFile: vi.fn(async () => undefined),
        appendText: vi.fn(async () => undefined),
      },
    },
  };
}

describe("CLI entrypoint", () => {
  test("parses public flags", () => {
    expect(parseOptions(["app", "--force", "-v"])).toEqual({
      force: true,
      help: false,
      version: true,
      reconfigure: false,
    });
  });

  test("prints help without onboarding", async () => {
    const fixture = context(["--help"]);
    await expect(main(fixture.context)).resolves.toBe(0);
    expect(fixture.log).toHaveBeenCalledWith(HELP_TEXT);
  });

  test("prints the package version", async () => {
    const fixture = context(["--version"]);
    await expect(main(fixture.context)).resolves.toBe(0);
    expect(fixture.log).toHaveBeenCalledWith("v1.2.3");
  });

  test("returns a deterministic error code", async () => {
    const fixture = context(["--version"]);
    fixture.context.fs.readText = vi.fn(async () => {
      throw new Error("package unavailable");
    });
    await expect(main(fixture.context)).resolves.toBe(1);
    expect(fixture.error).toHaveBeenCalledWith("package unavailable");
  });
});
