import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import type { PromptRunner } from "../core/contracts";

import { addApi } from "./addApi";
import { addComponent } from "./addComponent";
import { addLanguage } from "./addLanguage";
import { addLib } from "./addLib";
import { addPage } from "./addPage";
import { addText } from "./addText";
import { rmPage } from "./rmPage";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

async function projectFixture(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), "cnp-commands-"));
  temporaryDirectories.push(root);
  await mkdir(path.join(root, "src", "app", "[locale]"), { recursive: true });
  await mkdir(path.join(root, "src", "lib", "i18n"), { recursive: true });
  await mkdir(path.join(root, "messages", "en"), { recursive: true });
  await mkdir(path.join(root, "messages", "fr"), { recursive: true });
  await writeFile(
    path.join(root, "cnp.config.json"),
    JSON.stringify({ useI18n: true }),
  );
  await writeFile(
    path.join(root, "src", "lib", "i18n", "routing.ts"),
    'export const routing = { locales: ["en", "fr"], defaultLocale: "en" };\n',
  );
  await writeFile(path.join(root, "messages", "en", "_global_ui.json"), "{}");
  await writeFile(path.join(root, "messages", "fr", "_global_ui.json"), "{}");
  await writeFile(
    path.join(root, "messages", "en.ts"),
    'import globalUi from "./en/_global_ui.json";\n\nconst messages = {\n  _global_ui: globalUi,\n};\n\nexport default messages;\n',
  );
  await writeFile(
    path.join(root, "messages", "fr.ts"),
    'import globalUi from "./fr/_global_ui.json";\n\nconst messages = {\n  _global_ui: globalUi,\n};\n\nexport default messages;\n',
  );
  await writeFile(
    path.join(root, "src", "lib", "i18n", "messages.ts"),
    'import en from "../../../messages/en";\nimport fr from "../../../messages/fr";\n\nconst messages = { en, fr } as const;\n\nexport function getMessages(locale: keyof typeof messages) {\n  return messages[locale];\n}\n',
  );
  await writeFile(path.join(root, "preserved.txt"), "keep");
  return root;
}

describe("project evolution commands", () => {
  test("characterizes add and remove operations in an isolated project", async () => {
    const root = await projectFixture();

    await addApi(["addapi", "health"], root);
    expect(
      existsSync(path.join(root, "src", "app", "api", "health", "route.ts")),
    ).toBe(true);

    await addLib(["addlib", "sample.feature"], root);
    expect(
      await readFile(
        path.join(root, "src", "lib", "sample", "index.ts"),
        "utf8",
      ),
    ).toContain("feature");

    await addPage(["addpage", "Sample", "-Pl"], root);
    expect(
      existsSync(
        path.join(root, "src", "app", "[locale]", "Sample", "page.tsx"),
      ),
    ).toBe(true);
    expect(
      existsSync(path.join(root, "src", "ui", "Sample", "page-ui.tsx")),
    ).toBe(true);

    await addComponent(["addcomponent", "Widget", "-P", "Sample"], root);
    expect(
      existsSync(path.join(root, "src", "ui", "Sample", "Widget.tsx")),
    ).toBe(true);

    await addText(["addtext", "Sample.extra", "Extra text"], root);
    const messages = JSON.parse(
      await readFile(path.join(root, "messages", "en", "Sample.json"), "utf8"),
    ) as Record<string, unknown>;
    expect(messages.extra).toBe("Extra text");

    await addLanguage(["addlanguage", "de"], root);
    expect(existsSync(path.join(root, "messages", "de"))).toBe(true);

    await rmPage(["rmpage", "Sample"], root, undefined);
    expect(existsSync(path.join(root, "src", "ui", "Sample"))).toBe(false);
    expect(
      existsSync(path.join(root, "src", "app", "[locale]", "Sample")),
    ).toBe(false);
    expect(await readFile(path.join(root, "preserved.txt"), "utf8")).toBe(
      "keep",
    );
  });

  test("removes a nested page without deleting its shared parent", async () => {
    const root = await projectFixture();
    await addPage(["addpage", "Parent.Child", "-Pl"], root);
    await writeFile(path.join(root, "src", "ui", "Parent", "keep.txt"), "keep");

    await rmPage(["rmpage", "Parent.Child"], root, undefined);

    expect(existsSync(path.join(root, "src", "ui", "Parent", "Child"))).toBe(
      false,
    );
    expect(
      await readFile(
        path.join(root, "src", "ui", "Parent", "keep.txt"),
        "utf8",
      ),
    ).toBe("keep");
    const messages = JSON.parse(
      await readFile(path.join(root, "messages", "en", "Parent.json"), "utf8"),
    ) as Record<string, unknown>;
    expect(messages).not.toHaveProperty("Child");
  });

  test("cancels an interactive page deletion without mutation", async () => {
    const root = await projectFixture();
    await addPage(["addpage", "Sample", "-Pl"], root);
    const prompt = (async () => ({
      page: "Sample",
      confirm: false,
    })) as PromptRunner;

    await rmPage(["rmpage"], root, prompt);

    expect(existsSync(path.join(root, "src", "ui", "Sample"))).toBe(true);
    expect(
      existsSync(path.join(root, "src", "app", "[locale]", "Sample")),
    ).toBe(true);
  });

  test("removes the selected page after interactive confirmation", async () => {
    const root = await projectFixture();
    await addPage(["addpage", "Sample", "-Pl"], root);
    const prompt = (async () => ({
      page: "Sample",
      confirm: true,
    })) as PromptRunner;

    await rmPage(["rmpage"], root, prompt);

    expect(existsSync(path.join(root, "src", "ui", "Sample"))).toBe(false);
  });

  test("generates a nested page with matching UI imports and messages", async () => {
    const root = await projectFixture();

    await addPage(["addpage", "Parent.Child", "-Pl"], root);
    await addComponent(
      ["addcomponent", "Widget", "--page", "Parent.Child"],
      root,
    );

    expect(
      await readFile(
        path.join(
          root,
          "src",
          "app",
          "[locale]",
          "Parent",
          "Child",
          "page.tsx",
        ),
        "utf8",
      ),
    ).toContain('from "@/ui/Parent/Child/page-ui"');
    expect(
      await readFile(
        path.join(root, "src", "ui", "Parent", "Child", "page-ui.tsx"),
        "utf8",
      ),
    ).toContain('useTranslations("Parent.Child")');
    const messages = JSON.parse(
      await readFile(path.join(root, "messages", "en", "Parent.json"), "utf8"),
    ) as Record<string, unknown>;
    expect(messages.Child).toBeDefined();
    expect(messages).toHaveProperty("Child.Widget");
    expect(
      await readFile(path.join(root, "messages", "en.ts"), "utf8"),
    ).toContain('import Parent from "./en/Parent.json"');
    expect(await readFile(path.join(root, "preserved.txt"), "utf8")).toBe(
      "keep",
    );
  });

  test("registers a copied locale in every typed i18n entrypoint", async () => {
    const root = await projectFixture();
    const englishBefore = await readFile(
      path.join(root, "messages", "en.ts"),
      "utf8",
    );
    const frenchBefore = await readFile(
      path.join(root, "messages", "fr.ts"),
      "utf8",
    );

    await addLanguage(["addlanguage", "de"], root);

    expect(existsSync(path.join(root, "messages", "de"))).toBe(true);
    const germanAggregator = await readFile(
      path.join(root, "messages", "de.ts"),
      "utf8",
    );
    expect(germanAggregator).toContain('from "./de/_global_ui.json"');
    expect(germanAggregator).not.toContain('from "./en/');
    const registry = await readFile(
      path.join(root, "src", "lib", "i18n", "messages.ts"),
      "utf8",
    );
    expect(registry).toContain('import de from "../../../messages/de"');
    expect(registry).toContain("const messages = { en, fr, de } as const;");
    const routing = await readFile(
      path.join(root, "src", "lib", "i18n", "routing.ts"),
      "utf8",
    );
    expect(routing.match(/"de"/g)).toHaveLength(1);
    expect(await readFile(path.join(root, "messages", "en.ts"), "utf8")).toBe(
      englishBefore,
    );
    expect(await readFile(path.join(root, "messages", "fr.ts"), "utf8")).toBe(
      frenchBefore,
    );
  });

  test("does not write a locale when required i18n files are missing", async () => {
    const missingAggregatorRoot = await projectFixture();
    await rm(path.join(missingAggregatorRoot, "messages", "en.ts"));
    await expect(
      addLanguage(["addlanguage", "de"], missingAggregatorRoot),
    ).rejects.toThrow("Default locale aggregator not found");
    expect(existsSync(path.join(missingAggregatorRoot, "messages", "de"))).toBe(
      false,
    );

    const invalidRegistryRoot = await projectFixture();
    await writeFile(
      path.join(invalidRegistryRoot, "src", "lib", "i18n", "messages.ts"),
      "export const messages = new Map();\n",
    );
    await expect(
      addLanguage(["addlanguage", "de"], invalidRegistryRoot),
    ).rejects.toThrow("Unable to locate the typed messages registry");
    expect(existsSync(path.join(invalidRegistryRoot, "messages", "de"))).toBe(
      false,
    );
  });

  test("rejects an existing locale without changing its files", async () => {
    const root = await projectFixture();
    const germanDirectory = path.join(root, "messages", "de");
    await mkdir(germanDirectory);
    await writeFile(path.join(germanDirectory, "sentinel.json"), "{}\n");

    await expect(addLanguage(["addlanguage", "de"], root)).rejects.toThrow(
      "Locale de already exists",
    );
    expect(
      await readFile(path.join(germanDirectory, "sentinel.json"), "utf8"),
    ).toBe("{}\n");
    expect(existsSync(path.join(root, "messages", "de.ts"))).toBe(false);
  });

  test("rejects a command target containing a symbolic link", async () => {
    const root = await projectFixture();
    const sentinel = path.join(root, "sentinel-directory");
    await mkdir(sentinel);
    await symlink(sentinel, path.join(root, "src", "lib", "escape"));

    await expect(addLib(["addlib", "escape.module"], root)).rejects.toThrow(
      "Symbolic links are forbidden",
    );
    expect(existsSync(path.join(sentinel, "module.ts"))).toBe(false);
  });
});
