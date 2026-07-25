import { describe, expect, test } from "vitest";

import { parseAreaOption, requirePageArea } from "./page-area";

describe("page area arguments", () => {
  test.each([
    [
      ["addpage", "Profile", "--area", "public", "-P"],
      { area: "public", args: ["addpage", "Profile", "-P"] },
    ],
    [
      ["addpage", "--area", "user", "Profile", "-PLl"],
      { area: "user", args: ["addpage", "Profile", "-PLl"] },
    ],
  ])("extracts a separate area value from %j", (args, expected) => {
    expect(parseAreaOption(args)).toEqual(expected);
  });

  test.each([
    ["addpage", "Profile", "--area=public"],
    ["addpage", "Profile", "--area"],
    ["addpage", "Profile", "--area", "Public"],
    ["addpage", "Profile", "--area", "public", "--area", "public"],
  ])("rejects an invalid area contract", (...args) => {
    expect(() => parseAreaOption(args)).toThrow();
    try {
      parseAreaOption(args);
    } catch (error) {
      expect(error).toMatchObject({ code: "INVALID_ARGUMENT" });
    }
  });

  test("requires an explicit area for direct commands", () => {
    expect(() => requirePageArea(undefined, "addpage")).toThrow(
      "requires --area public or user",
    );
  });
});
