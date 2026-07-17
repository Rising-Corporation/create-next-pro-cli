import { describe, expect, test, vi } from "vitest";

import type { CliContext } from "./core/contracts";
import { OperationJournal } from "./core/operations";
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
        remove: vi.fn(async () => undefined),
        inspect: vi.fn(async () => null),
        list: vi.fn(async () => []),
      },
      operations: new OperationJournal(),
      outputMode: "human",
    },
  };
}

const USER_CONFIG = JSON.stringify({
  version: 1,
  shell: "bash",
  completionInstalled: false,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
});

describe("CLI entrypoint", () => {
  test("parses public flags", () => {
    expect(parseOptions(["app", "--force", "-v"])).toEqual({
      force: true,
      help: false,
      version: true,
      reconfigure: false,
      json: false,
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
    expect(fixture.error).toHaveBeenCalledWith(
      "ERROR [FILESYSTEM_ERROR]: package unavailable",
    );
  });

  test("emits one JSON document without stderr output", async () => {
    const fixture = context(["--json", "--version"]);
    await expect(main(fixture.context)).resolves.toBe(0);
    expect(fixture.log).toHaveBeenCalledTimes(1);
    expect(JSON.parse(String(fixture.log.mock.calls[0][0]))).toMatchObject({
      schemaVersion: 1,
      command: "version",
      status: "success",
      exitCode: 0,
      data: { version: "1.2.3" },
    });
    expect(fixture.error).not.toHaveBeenCalled();
  });

  test("reports required onboarding as a JSON error", async () => {
    const fixture = context(["--json", "sample-project"]);
    await expect(main(fixture.context)).resolves.toBe(1);
    const document = JSON.parse(String(fixture.log.mock.calls[0][0]));
    expect(document).toMatchObject({
      schemaVersion: 1,
      status: "failed",
      exitCode: 1,
      error: { code: "ONBOARDING_REQUIRED" },
      nextSteps: [{ kind: "rerun", required: true }],
    });
    expect(fixture.log).toHaveBeenCalledTimes(1);
    expect(fixture.error).not.toHaveBeenCalled();
  });

  test("refuses interactive reconfiguration in JSON mode", async () => {
    const fixture = context(["--reconfigure", "--json"]);
    fixture.context.fs.readText = vi.fn(async (target: string) =>
      target.endsWith("package.json") ? '{"version":"1.2.3"}' : USER_CONFIG,
    );
    await expect(main(fixture.context)).resolves.toBe(1);
    const document = JSON.parse(String(fixture.log.mock.calls[0][0]));
    expect(document.error.code).toBe("INTERACTIVE_INPUT_REQUIRED");
    expect(fixture.error).not.toHaveBeenCalled();
  });

  test("requires missing command input without prompting in JSON mode", async () => {
    const fixture = context(["addapi", "--json"]);
    fixture.context.fs.readText = vi.fn(async (target: string) =>
      target.endsWith("package.json") ? '{"version":"1.2.3"}' : USER_CONFIG,
    );
    await expect(main(fixture.context)).resolves.toBe(1);
    const document = JSON.parse(String(fixture.log.mock.calls[0][0]));
    expect(document.error.code).toBe("INTERACTIVE_INPUT_REQUIRED");
    expect(fixture.context.prompt).not.toHaveBeenCalled();
  });

  test("serves machine completion without onboarding", async () => {
    const fixture = context(["__complete"]);
    fixture.context.fs.readText = vi.fn(async (target: string) =>
      target.endsWith("package.json") ? '{"version":"1.2.3"}' : "{}",
    );
    await expect(main(fixture.context)).resolves.toBe(0);
    expect(fixture.log).toHaveBeenCalledWith("rmpage");
  });
});
