import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const EXTENSIONS = new Set([".js", ".mjs", ".ts", ".tsx"]);
const PUBLIC_FILES = [
  "README.md",
  "create-next-pro-completion.sh",
  "create-next-pro-completion.zsh",
  "templates/Projects/default/AGENTS.md",
  "templates/Projects/default/README.md",
];
const MARKDOWN_EXTENSIONS = new Set([".md"]);
const FRENCH =
  /[àâæçéèêëîïôœùûüÿ]|\b(?:ajouter|annule|annulé|commande|créé|créer|dans|erreur|fichier|inchangé|langue|modifier|modifié|projet|répertoire|supprimer|traduction|utilisez)\b/iu;

async function collect(
  directory: string,
  extensions = EXTENSIONS,
): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await readdir(path.join(ROOT, directory), {
    withFileTypes: true,
  })) {
    const relative = path.join(directory, entry.name);
    if (entry.isDirectory())
      files.push(...(await collect(relative, extensions)));
    else if (
      relative !== "scripts/check-public-language.ts" &&
      extensions.has(path.extname(entry.name))
    )
      files.push(relative);
  }
  return files;
}

const files = [
  ...PUBLIC_FILES,
  ...(await collect(
    "templates/Projects/default/.agents/skills",
    MARKDOWN_EXTENSIONS,
  )),
  ...(await collect("src")),
  ...(await collect("scripts")),
].sort();
const failures: string[] = [];
for (const file of files) {
  const lines = (await readFile(path.join(ROOT, file), "utf8")).split("\n");
  lines.forEach((line, index) => {
    if (FRENCH.test(line))
      failures.push(`${file}:${index + 1}: ${line.trim()}`);
  });
}
if (failures.length > 0) {
  throw new Error(
    `French text was found in public project surfaces:\n${failures.join("\n")}`,
  );
}
console.log(
  `Checked ${files.length} public files: English-only policy passed.`,
);
