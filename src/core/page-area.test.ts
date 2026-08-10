import { describe, expect, test } from "vitest";

import {
  PAGE_AREAS,
  PAGE_AREA_DEFINITIONS,
  areaRouteGroup,
  pageAreasExcept,
  parseAreaOption,
  requirePageArea,
} from "./page-area";

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
    [
      ["addpage", "Profile", "-P", "--area", "admin"],
      { area: "admin", args: ["addpage", "Profile", "-P"] },
    ],
  ])("extracts a separate area value from %j", (args, expected) => {
    expect(parseAreaOption(args)).toEqual(expected);
  });

  test.each([
    ["addpage", "Profile", "--area=public"],
    ["addpage", "Profile", "--area"],
    ["addpage", "Profile", "--area", "Public"],
    ["addpage", "Profile", "--area", "staff"],
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
      "requires --area public, user, or admin",
    );
  });

  test("keeps an exhaustive stable registry for every official area", () => {
    expect(PAGE_AREAS).toEqual(["public", "user", "admin"]);
    expect(Object.keys(PAGE_AREA_DEFINITIONS)).toEqual(PAGE_AREAS);
    expect(PAGE_AREA_DEFINITIONS).toEqual({
      public: {
        routeGroup: "(public)",
        label: "Public",
        uiTemplate: "page-ui.tsx",
        ownsMainLandmark: false,
        access: "anonymous",
      },
      user: {
        routeGroup: "(user)",
        label: "User",
        uiTemplate: "page-ui.user.tsx",
        ownsMainLandmark: true,
        access: "authenticated",
      },
      admin: {
        routeGroup: "(admin)",
        label: "Admin",
        uiTemplate: "page-ui.user.tsx",
        ownsMainLandmark: true,
        access: "admin",
      },
    });
    expect(areaRouteGroup("admin")).toBe("(admin)");
    expect(pageAreasExcept("user")).toEqual(["public", "admin"]);
  });
});
