import ts from "typescript";

export type LibraryExportKind = "value" | "type" | "mixed";

export type LibraryIndexPlan =
  | {
      action: "append";
      suffix: string;
      exportKind: Exclude<LibraryExportKind, "mixed">;
      preservedExportStatements: number;
    }
  | {
      action: "unchanged";
      exportKind: LibraryExportKind;
      preservedExportStatements: number;
    }
  | {
      action: "inconsistent";
      code: "INCONSISTENT_LIBRARY_INDEX" | "INCONSISTENT_LIBRARY_MODULE";
      message: string;
      hint: string;
    };

export type LibraryIndexInput = {
  indexContent: string;
  moduleContent: string;
  moduleSpecifier: string;
  symbol: string;
};

type ParsedSource = {
  sourceFile: ts.SourceFile;
  diagnostic?: string;
};

function parseSource(fileName: string, content: string): ParsedSource {
  const transpiled = ts.transpileModule(content, {
    fileName,
    reportDiagnostics: true,
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.Latest,
    },
  });
  const sourceFile = ts.createSourceFile(
    fileName,
    content,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const first = transpiled.diagnostics?.find(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
  );
  return {
    sourceFile,
    diagnostic: first
      ? ts.flattenDiagnosticMessageText(first.messageText, "\n")
      : undefined,
  };
}

function mergeKinds(
  current: LibraryExportKind | undefined,
  next: Exclude<LibraryExportKind, "mixed">,
): LibraryExportKind {
  return current && current !== next ? "mixed" : next;
}

function hasModifier(node: ts.Node, kind: ts.SyntaxKind): boolean {
  return Boolean(
    ts
      .getModifiers(node as ts.HasModifiers)
      ?.some((item) => item.kind === kind),
  );
}

function exportedStatement(statement: ts.Statement): boolean {
  return (
    ts.isExportDeclaration(statement) ||
    ts.isExportAssignment(statement) ||
    hasModifier(statement, ts.SyntaxKind.ExportKeyword)
  );
}

function bindingNames(name: ts.BindingName): string[] {
  if (ts.isIdentifier(name)) return [name.text];
  return name.elements.flatMap((element) =>
    ts.isOmittedExpression(element) ? [] : bindingNames(element.name),
  );
}

function declarationNames(statement: ts.Statement): string[] {
  if (
    (ts.isFunctionDeclaration(statement) ||
      ts.isClassDeclaration(statement) ||
      ts.isInterfaceDeclaration(statement) ||
      ts.isTypeAliasDeclaration(statement) ||
      ts.isEnumDeclaration(statement) ||
      ts.isModuleDeclaration(statement)) &&
    statement.name
  ) {
    return [statement.name.getText()];
  }
  if (ts.isVariableStatement(statement)) {
    return statement.declarationList.declarations.flatMap((declaration) =>
      bindingNames(declaration.name),
    );
  }
  return [];
}

function moduleText(
  statement: ts.ImportDeclaration | ts.ExportDeclaration,
): string | undefined {
  const value = statement.moduleSpecifier;
  return value && ts.isStringLiteralLike(value) ? value.text : undefined;
}

function sameModule(left: string | undefined, expected: string): boolean {
  if (!left) return false;
  if (left === expected) return true;
  return [".js", ".ts", ".tsx", ".mjs", ".mts", ".cjs", ".cts"].some(
    (extension) => left === `${expected}${extension}`,
  );
}

function targetImportBindings(
  sourceFile: ts.SourceFile,
  moduleSpecifier: string,
): Set<string> {
  const names = new Set<string>();
  for (const statement of sourceFile.statements) {
    if (
      !ts.isImportDeclaration(statement) ||
      !sameModule(moduleText(statement), moduleSpecifier) ||
      !statement.importClause
    ) {
      continue;
    }
    if (statement.importClause.name)
      names.add(statement.importClause.name.text);
    const bindings = statement.importClause.namedBindings;
    if (bindings && ts.isNamespaceImport(bindings))
      names.add(bindings.name.text);
    if (bindings && ts.isNamedImports(bindings)) {
      for (const element of bindings.elements) names.add(element.name.text);
    }
  }
  return names;
}

function analyzeIndex(
  sourceFile: ts.SourceFile,
  moduleSpecifier: string,
  symbol: string,
): {
  registered: boolean;
  registeredKind?: LibraryExportKind;
  conflictingExport: boolean;
  preservedExportStatements: number;
} {
  const targetBindings = targetImportBindings(sourceFile, moduleSpecifier);
  let registered = false;
  let registeredKind: LibraryExportKind | undefined;
  let conflictingExport = false;
  let preservedExportStatements = 0;

  for (const statement of sourceFile.statements) {
    if (exportedStatement(statement)) preservedExportStatements += 1;

    if (ts.isExportDeclaration(statement)) {
      const source = moduleText(statement);
      if (sameModule(source, moduleSpecifier)) {
        if (
          !statement.exportClause ||
          ts.isNamespaceExport(statement.exportClause)
        ) {
          registered = true;
          registeredKind = statement.isTypeOnly
            ? mergeKinds(registeredKind, "type")
            : "mixed";
        } else if (statement.exportClause.elements.length > 0) {
          registered = true;
          for (const element of statement.exportClause.elements) {
            registeredKind = mergeKinds(
              registeredKind,
              statement.isTypeOnly || element.isTypeOnly ? "type" : "value",
            );
          }
        }
        continue;
      }
      const clause = statement.exportClause;
      if (clause && ts.isNamespaceExport(clause)) {
        if (clause.name.text === symbol) conflictingExport = true;
        continue;
      }
      if (!clause || !ts.isNamedExports(clause)) continue;
      for (const element of clause.elements) {
        const publicName = element.name.text;
        const localName = (element.propertyName ?? element.name).text;
        if (!source && targetBindings.has(localName)) {
          registered = true;
          registeredKind = mergeKinds(
            registeredKind,
            statement.isTypeOnly || element.isTypeOnly ? "type" : "value",
          );
        }
        if (
          publicName === symbol &&
          !(source && sameModule(source, moduleSpecifier))
        ) {
          if (!targetBindings.has(localName)) conflictingExport = true;
        }
      }
      continue;
    }

    if (
      hasModifier(statement, ts.SyntaxKind.ExportKeyword) &&
      !hasModifier(statement, ts.SyntaxKind.DefaultKeyword) &&
      declarationNames(statement).includes(symbol)
    ) {
      conflictingExport = true;
    }
  }

  return {
    registered,
    registeredKind,
    conflictingExport,
    preservedExportStatements,
  };
}

function analyzeModuleExport(
  sourceFile: ts.SourceFile,
  symbol: string,
): LibraryExportKind | "absent" | "ambiguous" {
  let hasType = false;
  let hasValue = false;
  let hasUnknownStarExport = false;

  for (const statement of sourceFile.statements) {
    if (ts.isExportDeclaration(statement)) {
      const clause = statement.exportClause;
      if (!clause) {
        hasUnknownStarExport = true;
        continue;
      }
      if (ts.isNamespaceExport(clause)) {
        if (clause.name.text === symbol) hasValue = true;
        continue;
      }
      for (const element of clause.elements) {
        if (element.name.text !== symbol) continue;
        if (statement.isTypeOnly || element.isTypeOnly) hasType = true;
        else hasValue = true;
      }
      continue;
    }
    if (
      !hasModifier(statement, ts.SyntaxKind.ExportKeyword) ||
      hasModifier(statement, ts.SyntaxKind.DefaultKeyword) ||
      !declarationNames(statement).includes(symbol)
    ) {
      continue;
    }
    if (
      ts.isInterfaceDeclaration(statement) ||
      ts.isTypeAliasDeclaration(statement)
    ) {
      hasType = true;
    } else {
      hasValue = true;
    }
  }

  if (hasType && hasValue) return "mixed";
  if (hasValue) return "value";
  if (hasType) return "type";
  return hasUnknownStarExport ? "ambiguous" : "absent";
}

function lineEnding(content: string): "\n" | "\r\n" {
  return content.includes("\r\n") ? "\r\n" : "\n";
}

function appendSuffix(
  content: string,
  line: string,
  ending: "\n" | "\r\n",
): string {
  if (content.length === 0) return `${line}${ending}`;
  if (content.endsWith(`${ending}${ending}`)) return `${line}${ending}`;
  if (content.endsWith(ending)) return `${ending}${line}${ending}`;
  return `${ending}${ending}${line}${ending}`;
}

export function planLibraryIndex(input: LibraryIndexInput): LibraryIndexPlan {
  const parsedIndex = parseSource("index.ts", input.indexContent);
  if (parsedIndex.diagnostic) {
    return {
      action: "inconsistent",
      code: "INCONSISTENT_LIBRARY_INDEX",
      message: `Library index is not valid TypeScript: ${parsedIndex.diagnostic}`,
      hint: "Fix the library index before running addlib again.",
    };
  }
  const parsedModule = parseSource(`${input.symbol}.ts`, input.moduleContent);
  if (parsedModule.diagnostic) {
    return {
      action: "inconsistent",
      code: "INCONSISTENT_LIBRARY_MODULE",
      message: `Library module is not valid TypeScript: ${parsedModule.diagnostic}`,
      hint: "Fix the existing module before running addlib again.",
    };
  }

  const index = analyzeIndex(
    parsedIndex.sourceFile,
    input.moduleSpecifier,
    input.symbol,
  );
  const moduleExport = analyzeModuleExport(
    parsedModule.sourceFile,
    input.symbol,
  );
  if (index.registered) {
    const registeredKind =
      index.registeredKind === "value" && moduleExport === "mixed"
        ? "mixed"
        : (index.registeredKind ??
          (moduleExport === "type" || moduleExport === "mixed"
            ? moduleExport
            : "value"));
    return {
      action: "unchanged",
      exportKind: registeredKind,
      preservedExportStatements: index.preservedExportStatements,
    };
  }
  if (index.conflictingExport) {
    return {
      action: "inconsistent",
      code: "INCONSISTENT_LIBRARY_INDEX",
      message: `Library index already exports "${input.symbol}" from another source.`,
      hint: "Resolve the public export conflict before running addlib again.",
    };
  }
  if (moduleExport === "absent" || moduleExport === "ambiguous") {
    return {
      action: "inconsistent",
      code: "INCONSISTENT_LIBRARY_MODULE",
      message:
        moduleExport === "absent"
          ? `Library module does not export "${input.symbol}".`
          : `Library module may export "${input.symbol}" only through an unresolved star export.`,
      hint: `Add an explicit named export for "${input.symbol}" before running addlib again.`,
    };
  }

  const exportKind = moduleExport === "type" ? "type" : "value";
  const statement = `${exportKind === "type" ? "export type" : "export"} { ${input.symbol} } from "${input.moduleSpecifier}";`;
  return {
    action: "append",
    suffix: appendSuffix(
      input.indexContent,
      statement,
      lineEnding(input.indexContent),
    ),
    exportKind,
    preservedExportStatements: index.preservedExportStatements,
  };
}
