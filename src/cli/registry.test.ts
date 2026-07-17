import { describe, expect, test } from "vitest";

import { createCommandRegistry } from "./registry";

describe("command registry", () => {
  test("exposes every documented subcommand", () => {
    expect([...createCommandRegistry().keys()]).toEqual([
      "addcomponent",
      "addpage",
      "addlib",
      "addapi",
      "addlanguage",
      "addtext",
      "rmpage",
    ]);
  });
});
