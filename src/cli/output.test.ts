import { describe, expect, test, vi } from "vitest";

import type { CommandResult } from "../core/contracts";
import { createNodeContext } from "../runtime/node-context";
import { renderResult } from "./output";

function fixture() {
  const log = vi.fn();
  const warn = vi.fn();
  const error = vi.fn();
  const context = createNodeContext({
    cwd: "/tmp/project",
    packageRoot: "/tmp/package",
    terminal: { log, warn, error },
  });
  const result: CommandResult = {
    exitCode: 0,
    status: "success",
    command: "fixture",
    summary: "Updated the fixture.",
    projectRoot: "/tmp/project",
    events: [
      {
        sequence: 1,
        action: "created",
        resource: "file",
        role: "fixture-file",
        scope: "project",
        path: "src/fixture.ts",
      },
      {
        sequence: 2,
        action: "skipped",
        resource: "file",
        role: "optional-file",
        scope: "project",
        path: "optional.txt",
        detail: { reason: "not available" },
      },
    ],
    nextSteps: [
      {
        kind: "review",
        required: true,
        message: "Review the fixture.",
        paths: [{ scope: "project", path: "src/fixture.ts" }],
      },
    ],
    error: null,
  };
  return { context, result, log, warn, error };
}

describe("CLI output", () => {
  test("renders absolute paths and routes optional failures to stderr", () => {
    const { context, result, log, warn, error } = fixture();
    renderResult(result, context, "human");
    expect(log).toHaveBeenCalledWith(
      "CREATED fixture-file: /tmp/project/src/fixture.ts",
    );
    expect(log).toHaveBeenCalledWith("  /tmp/project/src/fixture.ts");
    expect(warn).toHaveBeenCalledWith(
      'SKIPPED optional-file: /tmp/project/optional.txt (reason="not available")',
    );
    expect(error).not.toHaveBeenCalled();
  });

  test("renders exactly one JSON document without stderr", () => {
    const { context, result, log, warn, error } = fixture();
    renderResult(result, context, "json");
    expect(log).toHaveBeenCalledTimes(1);
    expect(JSON.parse(String(log.mock.calls[0][0]))).toMatchObject({
      schemaVersion: 1,
      command: "fixture",
      status: "success",
    });
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });
});
