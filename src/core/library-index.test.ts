import { describe, expect, test } from "vitest";

import { planLibraryIndex } from "./library-index";

const valueModule = "export function primitives() {}\n";

function plan(indexContent: string, moduleContent = valueModule) {
  return planLibraryIndex({
    indexContent,
    moduleContent,
    moduleSpecifier: "./primitives",
    symbol: "primitives",
  });
}

describe("library index planner", () => {
  test("appends a direct re-export without changing the existing prefix", () => {
    const current = [
      "// Provider-neutral contracts",
      'export type { UserId } from "./user-id";',
      'export * from "./errors";',
      'export { validate } from "./validate";',
      "",
    ].join("\n");
    const result = plan(current);

    expect(result).toMatchObject({
      action: "append",
      exportKind: "value",
      preservedExportStatements: 3,
    });
    if (result.action !== "append") throw new Error("expected append plan");
    expect(`${current}${result.suffix}`.startsWith(current)).toBe(true);
    expect(result.suffix).toBe(
      '\nexport { primitives } from "./primitives";\n',
    );
  });

  test("preserves CRLF line endings", () => {
    const current = 'export { first } from "./first";\r\n';
    const result = plan(current);
    if (result.action !== "append") throw new Error("expected append plan");
    expect(result.suffix).toBe(
      '\r\nexport { primitives } from "./primitives";\r\n',
    );
  });

  test.each([
    'export { primitives } from "./primitives";\n',
    'export type { Primitive as Value } from "./primitives";\n',
    'export * from "./primitives";\n',
    'export * as primitivesApi from "./primitives";\n',
    'import { primitives } from "./primitives";\nexport { primitives };\n',
    'import {\n  primitives as primitivesApi,\n} from "./primitives";\nexport {\n  primitivesApi,\n};\n',
    'export { primitives } from "./primitives.js";\n',
  ])("recognizes an existing public module export", (current) => {
    expect(plan(current)).toMatchObject({ action: "unchanged" });
  });

  test("appends a type-only export for an existing type module", () => {
    const result = plan("export {};\n", "export type primitives = string;\n");
    expect(result).toMatchObject({ action: "append", exportKind: "type" });
    if (result.action !== "append") throw new Error("expected append plan");
    expect(result.suffix).toContain(
      'export type { primitives } from "./primitives";',
    );
  });

  test("recognizes a type-only star re-export", () => {
    expect(plan('export type * from "./primitives";\n')).toMatchObject({
      action: "unchanged",
      exportKind: "type",
    });
  });

  test("does not treat an empty export declaration as registration", () => {
    const result = plan('export {} from "./primitives";\n');
    expect(result).toMatchObject({ action: "append", exportKind: "value" });
  });

  test("rejects an explicit public-name conflict", () => {
    expect(
      plan('export { other as primitives } from "./other";\n'),
    ).toMatchObject({
      action: "inconsistent",
      code: "INCONSISTENT_LIBRARY_INDEX",
    });
  });

  test.each([
    "export default function primitives() {}\n",
    "export const another = 1;\n",
    'export * from "./internal";\n',
  ])("rejects a module without a provable named export", (moduleContent) => {
    expect(plan("export {};\n", moduleContent)).toMatchObject({
      action: "inconsistent",
      code: "INCONSISTENT_LIBRARY_MODULE",
    });
  });

  test("rejects invalid TypeScript without producing a suffix", () => {
    expect(plan("export {\n")).toMatchObject({
      action: "inconsistent",
      code: "INCONSISTENT_LIBRARY_INDEX",
    });
    expect(
      plan("export {};\n", "export function primitives( {\n"),
    ).toMatchObject({
      action: "inconsistent",
      code: "INCONSISTENT_LIBRARY_MODULE",
    });
  });

  test("keeps mixed declarations registered through an alias", () => {
    const result = planLibraryIndex({
      indexContent:
        'import { primitives as primitiveApi } from "./primitives";\nexport { primitiveApi };\n',
      moduleContent:
        'export interface primitives { value: string }\nexport const primitives = { value: "x" };\n',
      moduleSpecifier: "./primitives",
      symbol: "primitives",
    });
    expect(result).toMatchObject({
      action: "unchanged",
      exportKind: "mixed",
    });
  });

  test("classifies mixed named re-exports without rewriting them", () => {
    const result = planLibraryIndex({
      indexContent:
        'export { type primitives, primitives as primitivesValue } from "./primitives";\n',
      moduleContent:
        'export interface primitives { value: string }\nexport const primitives = { value: "x" };\n',
      moduleSpecifier: "./primitives",
      symbol: "primitives",
    });
    expect(result).toMatchObject({
      action: "unchanged",
      exportKind: "mixed",
      preservedExportStatements: 1,
    });
  });
});
