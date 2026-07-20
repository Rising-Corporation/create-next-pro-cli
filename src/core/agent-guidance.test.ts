import { readdir, readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { describe, expect, test } from "vitest";

import { createCommandRegistry } from "../cli/registry";
import {
  PROJECT_AGENT_GUIDANCE_FILES,
  PROJECT_SKILL_NAMES,
} from "./agent-guidance";

const templateRoot = fileURLToPath(
  new URL("../../templates/Projects/default/", import.meta.url),
);
const skillsRoot = path.join(templateRoot, ".agents", "skills");

async function source(relativePath: string): Promise<string> {
  return readFile(path.join(templateRoot, relativePath), "utf8");
}

function frontmatter(document: string): Map<string, string> {
  const match = document.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!match) throw new Error("SKILL.md has no YAML frontmatter");
  const fields = new Map<string, string>();
  for (const line of match[1].split(/\r?\n/)) {
    const separator = line.indexOf(":");
    if (separator < 1) throw new Error(`Invalid frontmatter line: ${line}`);
    fields.set(
      line.slice(0, separator).trim(),
      line.slice(separator + 1).trim(),
    );
  }
  return fields;
}

describe("generated project agent guidance", () => {
  test("keeps one prefixed skill for project creation and every public command", async () => {
    const publicCommands = [...createCommandRegistry().keys()].sort();
    const skillCommands = PROJECT_SKILL_NAMES.filter(
      (name) => name !== "create-next-pro-create-project",
    )
      .map((name) => name.replace("create-next-pro-", ""))
      .sort();

    expect(skillCommands).toEqual(publicCommands);
    expect(new Set(PROJECT_SKILL_NAMES).size).toBe(PROJECT_SKILL_NAMES.length);
    expect((await readdir(skillsRoot)).sort()).toEqual(
      [...PROJECT_SKILL_NAMES].sort(),
    );
  });

  test.each(PROJECT_SKILL_NAMES)(
    "validates the %s instruction-only skill",
    async (skillName) => {
      const relative = `.agents/skills/${skillName}/SKILL.md`;
      const document = await source(relative);
      const fields = frontmatter(document);

      expect(skillName).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(skillName.length).toBeLessThanOrEqual(64);
      expect([...fields.keys()].sort()).toEqual(["description", "name"]);
      expect(fields.get("name")).toBe(skillName);
      expect(fields.get("description")).toMatch(/^.+\. Use when .+\.$/);
      expect(document).toContain("--json");
      expect(document).toContain("bun run check");
      expect(document).not.toContain("TODO");
    },
  );

  test("resolves every AGENTS.md skill link and hides internal commands", async () => {
    const document = await source("AGENTS.md");
    const links = [
      ...document.matchAll(/\]\((\.agents\/skills\/[^)]+\/SKILL\.md)\)/g),
    ].map((match) => match[1]);

    expect(links.sort()).toEqual(
      PROJECT_AGENT_GUIDANCE_FILES.filter(
        (file) => file !== "AGENTS.md",
      ).sort(),
    );
    await Promise.all(links.map((link) => stat(path.join(templateRoot, link))));
    expect(document).not.toContain("__complete");
  });

  test("keeps repository skills visible to generated projects", async () => {
    const ignored = (await source(".gitignore.template"))
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    expect(ignored).not.toContain(".agents");
    expect(ignored).not.toContain(".agents/");
    expect(ignored).not.toContain("/.agents/");
  });
});
