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
import type { CommandHandler, PromptRunner } from "../core/contracts";
import { createNodeContext } from "../runtime/node-context";

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

async function runCommand(
  handler: CommandHandler,
  args: string[],
  root: string,
  prompt?: PromptRunner,
) {
  const context = createNodeContext({
    cwd: root,
    prompt: prompt ?? ((async () => ({})) as PromptRunner),
  });
  const result = await handler(args, context);
  for (const event of result.events) {
    expect(path.isAbsolute(event.path)).toBe(false);
    if (event.scope !== "project") continue;
    const target = path.resolve(root, event.path);
    if (["created", "copied", "updated"].includes(event.action)) {
      expect(existsSync(target), `${event.action} ${event.path}`).toBe(true);
    }
    if (event.action === "deleted") {
      expect(existsSync(target), `deleted ${event.path}`).toBe(false);
    }
  }
  return result;
}

describe("project evolution commands", () => {
  test("reports idempotent repetitions without overwriting generated code", async () => {
    const root = await projectFixture();
    const scenarios: Array<[CommandHandler, string[]]> = [
      [addApi, ["addapi", "health"]],
      [addLib, ["addlib", "sample.feature"]],
      [addPage, ["addpage", "Sample", "-Pl"]],
      [addComponent, ["addcomponent", "Widget", "--page", "Sample"]],
      [addText, ["addtext", "Sample.extra", "Extra text"]],
      [addLanguage, ["addlanguage", "de"]],
    ];
    for (const [handler, args] of scenarios) {
      const first = await runCommand(handler, args, root);
      expect(first.status).toBe("success");
      const second = await runCommand(handler, args, root);
      expect(second.status).toBe("unchanged");
      expect(second.exitCode).toBe(0);
    }
  });

  test("treats interactive cancellations as successful non-mutations", async () => {
    const root = await projectFixture();
    const scenarios: Array<[CommandHandler, string[]]> = [
      [addApi, ["addapi"]],
      [addLib, ["addlib"]],
      [addPage, ["addpage"]],
      [addComponent, ["addcomponent"]],
      [addLanguage, ["addlanguage"]],
      [rmPage, ["rmpage"]],
    ];
    const cancelledPrompt = (async () => ({})) as PromptRunner;
    for (const [handler, args] of scenarios) {
      const result = await runCommand(handler, args, root, cancelledPrompt);
      expect(result).toMatchObject({ status: "cancelled", exitCode: 0 });
      expect(result.events).toHaveLength(1);
      expect(result.events[0].action).toBe("cancelled");
    }
  });

  test("characterizes add and remove operations in an isolated project", async () => {
    const root = await projectFixture();

    await runCommand(addApi, ["addapi", "health"], root);
    expect(
      existsSync(path.join(root, "src", "app", "api", "health", "route.ts")),
    ).toBe(true);

    await runCommand(addLib, ["addlib", "sample.feature"], root);
    expect(
      await readFile(
        path.join(root, "src", "lib", "sample", "index.ts"),
        "utf8",
      ),
    ).toContain("feature");

    await runCommand(addPage, ["addpage", "Sample", "-Pl"], root);
    expect(
      existsSync(
        path.join(root, "src", "app", "[locale]", "Sample", "page.tsx"),
      ),
    ).toBe(true);
    expect(
      existsSync(path.join(root, "src", "ui", "Sample", "page-ui.tsx")),
    ).toBe(true);

    await runCommand(
      addComponent,
      ["addcomponent", "Widget", "-P", "Sample"],
      root,
    );
    expect(
      existsSync(path.join(root, "src", "ui", "Sample", "Widget.tsx")),
    ).toBe(true);

    await runCommand(addText, ["addtext", "Sample.extra", "Extra text"], root);
    const messages = JSON.parse(
      await readFile(path.join(root, "messages", "en", "Sample.json"), "utf8"),
    ) as Record<string, unknown>;
    expect(messages.extra).toBe("Extra text");

    await runCommand(addLanguage, ["addlanguage", "de"], root);
    expect(existsSync(path.join(root, "messages", "de"))).toBe(true);

    await runCommand(rmPage, ["rmpage", "Sample"], root);
    expect(existsSync(path.join(root, "src", "ui", "Sample"))).toBe(false);
    expect(
      existsSync(path.join(root, "src", "app", "[locale]", "Sample")),
    ).toBe(false);
    expect(
      await readFile(path.join(root, "messages", "en.ts"), "utf8"),
    ).not.toContain("./en/Sample.json");
    expect(
      await readFile(path.join(root, "messages", "fr.ts"), "utf8"),
    ).not.toContain("./fr/Sample.json");
    expect(await readFile(path.join(root, "preserved.txt"), "utf8")).toBe(
      "keep",
    );
  });

  test("removes a nested page without deleting its shared parent", async () => {
    const root = await projectFixture();
    await runCommand(addPage, ["addpage", "Parent.Child", "-Pl"], root);
    await writeFile(path.join(root, "src", "ui", "Parent", "keep.txt"), "keep");

    await runCommand(rmPage, ["rmpage", "Parent.Child"], root);

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
    await runCommand(addPage, ["addpage", "Sample", "-Pl"], root);
    const prompt = (async () => ({
      page: "Sample",
      confirm: false,
    })) as PromptRunner;

    const result = await runCommand(rmPage, ["rmpage"], root, prompt);
    expect(result.status).toBe("cancelled");

    expect(existsSync(path.join(root, "src", "ui", "Sample"))).toBe(true);
    expect(
      existsSync(path.join(root, "src", "app", "[locale]", "Sample")),
    ).toBe(true);
  });

  test("removes the selected page after interactive confirmation", async () => {
    const root = await projectFixture();
    await runCommand(addPage, ["addpage", "Sample", "-Pl"], root);
    const prompt = (async () => ({
      page: "Sample",
      confirm: true,
    })) as PromptRunner;

    await runCommand(rmPage, ["rmpage"], root, prompt);

    expect(existsSync(path.join(root, "src", "ui", "Sample"))).toBe(false);
  });

  test("generates a nested page with matching UI imports and messages", async () => {
    const root = await projectFixture();

    await runCommand(addPage, ["addpage", "Parent.Child", "-Pl"], root);
    await runCommand(
      addComponent,
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

  test("uses valid TypeScript identifiers for kebab-case resources", async () => {
    const root = await projectFixture();
    await runCommand(addPage, ["addpage", "account-settings", "-P"], root);
    await runCommand(
      addComponent,
      ["addcomponent", "status-card", "--page", "account-settings"],
      root,
    );
    await runCommand(addLib, ["addlib", "analytics.track-event"], root);

    expect(
      await readFile(
        path.join(
          root,
          "src",
          "app",
          "[locale]",
          "account-settings",
          "page.tsx",
        ),
        "utf8",
      ),
    ).toContain("AccountSettingsPageUI");
    expect(
      await readFile(
        path.join(root, "src", "ui", "account-settings", "StatusCard.tsx"),
        "utf8",
      ),
    ).toContain("const StatusCard");
    expect(
      await readFile(
        path.join(root, "src", "lib", "analytics", "index.ts"),
        "utf8",
      ),
    ).toContain('import { trackEvent } from "./track-event";');
    expect(
      await readFile(path.join(root, "messages", "en.ts"), "utf8"),
    ).toContain('import accountSettings from "./en/account-settings.json";');
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

    const result = await runCommand(addLanguage, ["addlanguage", "de"], root);
    expect(result.nextSteps[0]).toMatchObject({
      kind: "translate",
      required: true,
    });
    const copiedMessages = result.events.filter(
      (event) =>
        event.action === "copied" && event.role === "translation-messages",
    );
    expect(result.nextSteps[0].paths.map((target) => target.path)).toEqual(
      copiedMessages.map((event) => event.path),
    );
    expect(JSON.stringify(result.events)).not.toMatch(
      /(?:content|credential|password|secret|token|value)/i,
    );

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
      runCommand(addLanguage, ["addlanguage", "de"], missingAggregatorRoot),
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
      runCommand(addLanguage, ["addlanguage", "de"], invalidRegistryRoot),
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

    await expect(
      runCommand(addLanguage, ["addlanguage", "de"], root),
    ).rejects.toThrow("partially configured");
    expect(
      await readFile(path.join(germanDirectory, "sentinel.json"), "utf8"),
    ).toBe("{}\n");
    expect(existsSync(path.join(root, "messages", "de.ts"))).toBe(false);
  });

  test("prevents partial page removal when a locale aggregator is inconsistent", async () => {
    const root = await projectFixture();
    await runCommand(addPage, ["addpage", "Sample", "-Pl"], root);
    const aggregator = path.join(root, "messages", "en.ts");
    const current = await readFile(aggregator, "utf8");
    await writeFile(aggregator, current.replace(/^\s*Sample,\s*$/m, ""));

    await expect(
      runCommand(rmPage, ["rmpage", "Sample"], root),
    ).rejects.toMatchObject({ code: "INCONSISTENT_LOCALE" });
    expect(existsSync(path.join(root, "messages", "en", "Sample.json"))).toBe(
      true,
    );
    expect(existsSync(path.join(root, "src", "ui", "Sample"))).toBe(true);
    expect(
      existsSync(path.join(root, "src", "app", "[locale]", "Sample")),
    ).toBe(true);
  });

  test("rejects a command target containing a symbolic link", async () => {
    const root = await projectFixture();
    const sentinel = path.join(root, "sentinel-directory");
    await mkdir(sentinel);
    await symlink(sentinel, path.join(root, "src", "lib", "escape"));

    await expect(
      runCommand(addLib, ["addlib", "escape.module"], root),
    ).rejects.toThrow("Symbolic links are forbidden");
    expect(existsSync(path.join(sentinel, "module.ts"))).toBe(false);
  });
});
