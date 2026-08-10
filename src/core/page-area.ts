import { CliError } from "./contracts";

export type PageAccess = "anonymous" | "authenticated" | "admin";

export type PageAreaDefinition = {
  routeGroup: `(${string})`;
  label: string;
  uiTemplate: "page-ui.tsx" | "page-ui.user.tsx";
  ownsMainLandmark: boolean;
  access: PageAccess;
};

export const PAGE_AREA_DEFINITIONS = {
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
} as const satisfies Record<string, PageAreaDefinition>;

export type PageArea = keyof typeof PAGE_AREA_DEFINITIONS;

export const PAGE_AREAS = [
  "public",
  "user",
  "admin",
] as const satisfies readonly PageArea[];

const PAGE_AREA_VALUE_LIST = "public, user, or admin";

export function pageAreasExcept(area: PageArea): PageArea[] {
  return PAGE_AREAS.filter((candidate) => candidate !== area);
}

export function comparePageAreas(left: PageArea, right: PageArea): number {
  return PAGE_AREAS.indexOf(left) - PAGE_AREAS.indexOf(right);
}

export type ParsedAreaArguments = {
  area?: PageArea;
  args: string[];
};

export function isPageArea(value: string): value is PageArea {
  return (PAGE_AREAS as readonly string[]).includes(value);
}

export function parseAreaOption(args: string[]): ParsedAreaArguments {
  const remaining = args.length > 0 ? [args[0]] : [];
  let area: PageArea | undefined;

  for (let index = 1; index < args.length; index += 1) {
    const argument = args[index];
    if (argument.startsWith("--area=")) {
      throw new CliError(
        `The --area option must use a separate ${PAGE_AREA_VALUE_LIST} value.`,
        {
          code: "INVALID_ARGUMENT",
          hint: "Use --area public, --area user, or --area admin.",
        },
      );
    }
    if (argument !== "--area") {
      remaining.push(argument);
      continue;
    }
    if (area) {
      throw new CliError("The --area option can only be provided once.", {
        code: "INVALID_ARGUMENT",
      });
    }
    const value = args[index + 1];
    if (!value || value.startsWith("-")) {
      throw new CliError(
        `The --area option requires ${PAGE_AREA_VALUE_LIST}.`,
        {
          code: "INVALID_ARGUMENT",
          hint: "Use --area public, --area user, or --area admin.",
        },
      );
    }
    if (!isPageArea(value)) {
      throw new CliError(`Unsupported page area: ${value}.`, {
        code: "INVALID_ARGUMENT",
        hint: "Use --area public, --area user, or --area admin.",
      });
    }
    area = value;
    index += 1;
  }

  return { area, args: remaining };
}

export function requirePageArea(
  area: PageArea | undefined,
  command: string,
): PageArea {
  if (area) return area;
  throw new CliError(
    `The ${command} command requires --area ${PAGE_AREA_VALUE_LIST}.`,
    {
      code: "INVALID_ARGUMENT",
      hint: `Run ${command} with --area public, --area user, or --area admin.`,
    },
  );
}

export function areaRouteGroup(area: PageArea): `(${PageArea})` {
  return PAGE_AREA_DEFINITIONS[area].routeGroup;
}
