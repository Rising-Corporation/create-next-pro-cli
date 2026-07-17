import { describe, expect, test, vi } from "vitest";

import type { CliContext } from "./contracts";
import {
  MutationGateway,
  OperationJournal,
  statusFromEvents,
} from "./operations";
import { createNodeContext } from "../runtime/node-context";

describe("operation contracts", () => {
  test("derives deterministic statuses from ordered events", () => {
    const journal = new OperationJournal();
    journal.record({
      action: "unchanged",
      resource: "file",
      role: "fixture",
      scope: "project",
      path: "fixture.ts",
    });
    expect(statusFromEvents(journal.snapshot())).toBe("unchanged");
    journal.record({
      action: "updated",
      resource: "file",
      role: "fixture",
      scope: "project",
      path: "fixture.ts",
    });
    expect(statusFromEvents(journal.snapshot())).toBe("success");
    expect(journal.snapshot().map((event) => event.sequence)).toEqual([1, 2]);
  });

  test("redacts sensitive detail fields", () => {
    const journal = new OperationJournal();
    const event = journal.record({
      action: "updated",
      resource: "configuration",
      role: "fixture",
      scope: "config",
      path: "config.json",
      detail: {
        token: "private-token",
        content: "private-content",
        locale: "en",
      },
    });
    expect(event.detail).toEqual({
      token: "[REDACTED]",
      content: "[REDACTED]",
      locale: "en",
    });
    expect(JSON.stringify(event)).not.toContain("private-");
  });

  test("records a mutation only after the file-system operation succeeds", async () => {
    const context = createNodeContext({ cwd: "/tmp/project" });
    context.fs = {
      ...context.fs,
      exists: vi.fn(() => false),
      mkdir: vi.fn(async () => undefined),
      writeText: vi.fn(async () => {
        throw new Error("write failed");
      }),
    } as CliContext["fs"];
    const gateway = new MutationGateway(context, context.cwd);
    await expect(
      gateway.write("/tmp/project/failure.ts", "content", {
        role: "fixture",
      }),
    ).rejects.toThrow("write failed");
    expect(context.operations.snapshot()).toEqual([]);
  });
});
