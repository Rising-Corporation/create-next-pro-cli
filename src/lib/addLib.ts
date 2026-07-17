import { join } from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import prompts from "prompts";
import { existsSync } from "node:fs";

import { loadConfig, capitalize } from "./utils";
import { resolvePackageRoot } from "../runtime/node-context";

export async function addLib(args: string[], cwd = process.cwd()) {
  let libArg = args[1];
  if (!libArg || libArg.startsWith("-")) {
    const response = await prompts.prompt({
      type: "text",
      name: "libArg",
      message: "📦 Lib name to add:",
      validate: (name: string) => (name ? true : "Lib name is required"),
    });
    libArg = response.libArg;
  }

  let libName = libArg;
  let fileName: string | null = null;
  if (libArg.includes(".")) {
    [libName, fileName] = libArg.split(".");
  }

  const config = await loadConfig(cwd);
  if (!config) {
    console.error(
      "❌ Configuration file cnp.config.json not found. Run this command from the project root.",
    );
    return;
  }

  const libDir = join(cwd, "src", "lib", libName);
  if (!existsSync(libDir)) {
    await mkdir(libDir, { recursive: true });
  }

  const templateDir = join(
    resolvePackageRoot(import.meta.url),
    "templates",
    "Lib",
  );
  const indexTemplate = join(templateDir, "index.ts");
  const fileTemplate = join(templateDir, "item.ts");

  const indexPath = join(libDir, "index.ts");
  if (!existsSync(indexPath)) {
    if (existsSync(indexTemplate)) {
      const content = await readFile(indexTemplate, "utf-8");
      await writeFile(indexPath, content);
    } else {
      await writeFile(indexPath, "export {}\n");
    }
    console.log(`📄 File created: ${indexPath}`);
  }

  if (fileName) {
    const filePath = join(libDir, `${fileName}.ts`);
    if (!existsSync(filePath)) {
      if (existsSync(fileTemplate)) {
        let content = await readFile(fileTemplate, "utf-8");
        content = content
          .replace(/template/g, fileName)
          .replace(/Template/g, capitalize(fileName));
        await writeFile(filePath, content);
      } else {
        await writeFile(
          filePath,
          `export function ${fileName}() {\n  // TODO: implement\n}\n`,
        );
      }
      console.log(`📄 File created: ${filePath}`);
    }

    let indexContent = await readFile(indexPath, "utf-8");
    const importLine = `import { ${fileName} } from "./${fileName}";`;
    const importRegex = new RegExp(
      `import\\s*{\\s*${fileName}\\s*}\\s*from\\s*"\\./${fileName}";`,
    );
    const exportRegex = /export\s*{([^}]*)}/m;

    const imports: string[] = [];
    const exportsSet: string[] = [];
    for (const line of indexContent.split("\n")) {
      if (line.startsWith("import")) {
        imports.push(line);
      } else if (line.startsWith("export")) {
        const match = line.match(exportRegex);
        if (match && match[1]) {
          exportsSet.push(
            ...match[1]
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
          );
        }
      }
    }

    if (!imports.some((l) => importRegex.test(l))) {
      imports.push(importLine);
    }
    if (!exportsSet.includes(fileName)) {
      exportsSet.push(fileName);
    }

    indexContent =
      imports.join("\n") + "\n\nexport { " + exportsSet.join(", ") + " };\n";
    await writeFile(indexPath, indexContent);
    console.log(`✏️ Updated index: ${indexPath}`);
  }

  console.log(
    `✅ Lib "${libName}"${fileName ? ` with module ${fileName}` : ""} added.`,
  );
}
