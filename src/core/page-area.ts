import { CliError } from "./contracts";

export const PAGE_AREAS = ["public", "user"] as const;

export type PageArea = (typeof PAGE_AREAS)[number];

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
        "The --area option must use a separate public or user value.",
        {
          code: "INVALID_ARGUMENT",
          hint: "Use --area public or --area user.",
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
      throw new CliError("The --area option requires public or user.", {
        code: "INVALID_ARGUMENT",
        hint: "Use --area public or --area user.",
      });
    }
    if (!isPageArea(value)) {
      throw new CliError(`Unsupported page area: ${value}.`, {
        code: "INVALID_ARGUMENT",
        hint: "Use --area public or --area user.",
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
  throw new CliError(`The ${command} command requires --area public or user.`, {
    code: "INVALID_ARGUMENT",
    hint: `Run ${command} with --area public or --area user.`,
  });
}

export function areaRouteGroup(area: PageArea): `(${PageArea})` {
  return `(${area})`;
}
