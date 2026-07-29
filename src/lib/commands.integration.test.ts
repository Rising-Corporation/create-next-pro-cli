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
  await mkdir(path.join(root, "src", "app", "[locale]", "(public)"), {
    recursive: true,
  });
  await mkdir(path.join(root, "src", "app", "[locale]", "(user)"), {
    recursive: true,
  });
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
  test("requires an explicit area for direct page operations", async () => {
    const root = await projectFixture();

    for (const args of [
      ["addpage", "Sample", "-P"],
      ["addpage", "Sample", "--area=public", "-P"],
      ["addpage", "Sample", "--area", "Public", "-P"],
      ["addpage", "Sample", "--area", "public", "--area", "public", "-P"],
    ]) {
      await expect(runCommand(addPage, args, root)).rejects.toMatchObject({
        code: "INVALID_ARGUMENT",
      });
    }
    expect(existsSync(path.join(root, "src", "ui", "Sample"))).toBe(false);

    await expect(
      runCommand(
        addComponent,
        ["addcomponent", "GlobalWidget", "--area", "public"],
        root,
      ),
    ).rejects.toMatchObject({ code: "INVALID_ARGUMENT" });

    await runCommand(
      addPage,
      ["addpage", "Sample", "--area", "public", "-P"],
      root,
    );
    await expect(
      runCommand(
        addComponent,
        ["addcomponent", "Widget", "--page", "Sample"],
        root,
      ),
    ).rejects.toMatchObject({ code: "INVALID_ARGUMENT" });
    await expect(
      runCommand(
        addComponent,
        [
          "addcomponent",
          "WrongAreaWidget",
          "--page",
          "Sample",
          "--area",
          "user",
        ],
        root,
      ),
    ).rejects.toMatchObject({ code: "TARGET_NOT_FOUND" });
    expect(
      existsSync(path.join(root, "src", "ui", "Sample", "WrongAreaWidget.tsx")),
    ).toBe(false);
    await expect(
      runCommand(rmPage, ["rmpage", "Sample"], root),
    ).rejects.toMatchObject({ code: "INVALID_ARGUMENT" });
    expect(
      existsSync(
        path.join(root, "src", "app", "[locale]", "(public)", "Sample"),
      ),
    ).toBe(true);
  });

  test("generates area-aware routes and structured results", async () => {
    const root = await projectFixture();
    const publicResult = await runCommand(
      addPage,
      ["addpage", "--area", "public", "PublicPage", "-P"],
      root,
    );
    const userResult = await runCommand(
      addPage,
      ["addpage", "UserPage", "-P", "--area", "user"],
      root,
    );

    expect(publicResult.data).toEqual({
      area: "public",
      logicalName: "PublicPage",
    });
    expect(userResult.data).toEqual({
      area: "user",
      logicalName: "UserPage",
    });
    expect(
      publicResult.events.every((event) => event.detail?.area === "public"),
    ).toBe(true);
    expect(
      userResult.events.every((event) => event.detail?.area === "user"),
    ).toBe(true);
    expect(
      await readFile(
        path.join(root, "src", "ui", "PublicPage", "page-ui.tsx"),
        "utf8",
      ),
    ).toContain('<main className="px-4 pb-8 pt-24');
    expect(
      await readFile(
        path.join(root, "src", "ui", "UserPage", "page-ui.tsx"),
        "utf8",
      ),
    ).not.toContain("<main");
    expect(
      await readFile(
        path.join(root, "src", "ui", "UserPage", "page-ui.tsx"),
        "utf8",
      ),
    ).toContain('<section className="px-4 pb-8 pt-24');

    for (const [area, logicalName] of [
      ["public", "PublicParent.Child"],
      ["user", "UserParent.Child"],
    ] as const) {
      const result = await runCommand(
        addPage,
        ["addpage", logicalName, "--area", area, "-P"],
        root,
      );
      expect(result.data).toEqual({ area, logicalName });
      expect(
        existsSync(
          path.join(
            root,
            "src",
            "app",
            "[locale]",
            `(${area})`,
            ...logicalName.split("."),
            "page.tsx",
          ),
        ),
      ).toBe(true);
    }
  });

  test("prompts for a page name and area without selecting a default", async () => {
    const root = await projectFixture();
    let questions: Array<Record<string, unknown>> = [];
    const prompt = (async (input: unknown) => {
      questions = input as Array<Record<string, unknown>>;
      return { pageName: "Interactive", area: "user" };
    }) as PromptRunner;

    const result = await runCommand(addPage, ["addpage", "-P"], root, prompt);

    expect(questions.map((question) => question.name)).toEqual([
      "pageName",
      "area",
    ]);
    expect(questions[1]).not.toHaveProperty("initial");
    expect(result.data).toEqual({ area: "user", logicalName: "Interactive" });
  });

  test("rejects cross-area, legacy and duplicate logical routes", async () => {
    const root = await projectFixture();
    await runCommand(
      addPage,
      ["addpage", "Shared", "--area", "public", "-P"],
      root,
    );
    await expect(
      runCommand(addPage, ["addpage", "Shared", "--area", "user", "-P"], root),
    ).rejects.toMatchObject({ code: "TARGET_EXISTS" });
    expect(
      existsSync(path.join(root, "src", "app", "[locale]", "(user)", "Shared")),
    ).toBe(false);

    const legacy = path.join(root, "src", "app", "[locale]", "Legacy");
    await mkdir(legacy, { recursive: true });
    await writeFile(path.join(legacy, "page.tsx"), "export default 1;\n");
    await expect(
      runCommand(
        addPage,
        ["addpage", "Legacy", "--area", "public", "-P"],
        root,
      ),
    ).rejects.toMatchObject({ code: "INCONSISTENT_ROUTE" });

    const duplicateUser = path.join(
      root,
      "src",
      "app",
      "[locale]",
      "(user)",
      "Shared",
    );
    await mkdir(duplicateUser, { recursive: true });
    await writeFile(
      path.join(duplicateUser, "page.tsx"),
      "export default 1;\n",
    );
    await expect(
      runCommand(rmPage, ["rmpage", "Shared", "--area", "public"], root),
    ).rejects.toMatchObject({ code: "INCONSISTENT_ROUTE" });
    expect(
      existsSync(
        path.join(root, "src", "app", "[locale]", "(public)", "Shared"),
      ),
    ).toBe(true);
    expect(existsSync(duplicateUser)).toBe(true);
  });

  test("reports idempotent repetitions without overwriting generated code", async () => {
    const root = await projectFixture();
    const scenarios: Array<[CommandHandler, string[]]> = [
      [addApi, ["addapi", "health"]],
      [addLib, ["addlib", "sample.feature"]],
      [addPage, ["addpage", "Sample", "--area", "public", "-Pl"]],
      [
        addComponent,
        ["addcomponent", "Widget", "--page", "Sample", "--area", "public"],
      ],
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

  test("adds a missing route file on a later call without replacing page code", async () => {
    const root = await projectFixture();
    await runCommand(
      addPage,
      ["addpage", "Incremental", "--area", "public", "-P"],
      root,
    );
    const pageFile = path.join(
      root,
      "src",
      "app",
      "[locale]",
      "(public)",
      "Incremental",
      "page.tsx",
    );
    await writeFile(
      pageFile,
      "export default function Preserved() { return null; }\n",
    );

    const result = await runCommand(
      addPage,
      ["addpage", "Incremental", "--area", "public", "-L"],
      root,
    );

    expect(result.status).toBe("success");
    expect(await readFile(pageFile, "utf8")).toContain("Preserved");
    expect(existsSync(path.join(path.dirname(pageFile), "layout.tsx"))).toBe(
      true,
    );
  });

  test("generates Next.js 16-compatible layouts and preserves existing layout code", async () => {
    const root = await projectFixture();
    await runCommand(addPage, ["addpage", "Profile", "--area", "public"], root);
    const publicRoute = path.join(
      root,
      "src",
      "app",
      "[locale]",
      "(public)",
      "Profile",
    );
    const publicLayout = await readFile(
      path.join(publicRoute, "layout.tsx"),
      "utf8",
    );

    expect(publicLayout).toContain('import type { ReactNode } from "react";');
    expect(publicLayout).toContain("function ProfileLayout");
    expect(publicLayout).toContain("children: ReactNode");
    expect(publicLayout).not.toContain("params");
    expect(existsSync(path.join(publicRoute, "page.tsx"))).toBe(true);
    expect(existsSync(path.join(publicRoute, "loading.tsx"))).toBe(true);

    await runCommand(
      addPage,
      ["addpage", "Account.Security", "--area", "user", "-L"],
      root,
    );
    const userLayoutFile = path.join(
      root,
      "src",
      "app",
      "[locale]",
      "(user)",
      "Account",
      "Security",
      "layout.tsx",
    );
    const userLayout = await readFile(userLayoutFile, "utf8");
    expect(userLayout).toContain("function SecurityLayout");
    expect(userLayout).toContain("children: ReactNode");
    expect(userLayout).not.toContain("params");

    const customLayout =
      "export default function PreservedLayout({ children }: { children: React.ReactNode }) { return children; }\n";
    await writeFile(userLayoutFile, customLayout);
    const repeated = await runCommand(
      addPage,
      ["addpage", "Account.Security", "--area", "user", "-L"],
      root,
    );
    expect(repeated.status).toBe("unchanged");
    expect(await readFile(userLayoutFile, "utf8")).toBe(customLayout);
  });

  test("treats interactive cancellations as successful non-mutations", async () => {
    const root = await projectFixture();
    const scenarios: Array<[CommandHandler, string[]]> = [
      [addApi, ["addapi"]],
      [addLib, ["addlib"]],
      [addPage, ["addpage"]],
      [addComponent, ["addcomponent"]],
      [addLanguage, ["addlanguage"]],
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

    await runCommand(
      addPage,
      ["addpage", "Sample", "--area", "public", "-Pl"],
      root,
    );
    expect(
      existsSync(
        path.join(
          root,
          "src",
          "app",
          "[locale]",
          "(public)",
          "Sample",
          "page.tsx",
        ),
      ),
    ).toBe(true);
    expect(
      existsSync(path.join(root, "src", "ui", "Sample", "page-ui.tsx")),
    ).toBe(true);

    await runCommand(
      addComponent,
      ["addcomponent", "Widget", "-P", "Sample", "--area", "public"],
      root,
    );
    expect(
      existsSync(path.join(root, "src", "ui", "Sample", "Widget.tsx")),
    ).toBe(true);
    expect(
      await readFile(
        path.join(root, "src", "ui", "Sample", "Widget.tsx"),
        "utf8",
      ),
    ).toContain('{t("Widget.title")}</h2>');

    await runCommand(addText, ["addtext", "Sample.extra", "Extra text"], root);
    const messages = JSON.parse(
      await readFile(path.join(root, "messages", "en", "Sample.json"), "utf8"),
    ) as Record<string, unknown>;
    expect(messages.extra).toBe("Extra text");

    await runCommand(addLanguage, ["addlanguage", "de"], root);
    expect(existsSync(path.join(root, "messages", "de"))).toBe(true);

    await runCommand(rmPage, ["rmpage", "Sample", "--area", "public"], root);
    expect(existsSync(path.join(root, "src", "ui", "Sample"))).toBe(false);
    expect(
      existsSync(
        path.join(root, "src", "app", "[locale]", "(public)", "Sample"),
      ),
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
    await runCommand(
      addPage,
      ["addpage", "Parent.Child", "--area", "user", "-Pl"],
      root,
    );
    await writeFile(path.join(root, "src", "ui", "Parent", "keep.txt"), "keep");

    await runCommand(
      rmPage,
      ["rmpage", "Parent.Child", "--area", "user"],
      root,
    );

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
    await runCommand(
      addPage,
      ["addpage", "Sample", "--area", "public", "-Pl"],
      root,
    );
    const prompt = (async () => ({
      page: "public:Sample",
      confirm: false,
    })) as PromptRunner;

    const result = await runCommand(rmPage, ["rmpage"], root, prompt);
    expect(result.status).toBe("cancelled");

    expect(existsSync(path.join(root, "src", "ui", "Sample"))).toBe(true);
    expect(
      existsSync(
        path.join(root, "src", "app", "[locale]", "(public)", "Sample"),
      ),
    ).toBe(true);
  });

  test("filters the interactive removal catalog by area", async () => {
    const root = await projectFixture();
    await runCommand(
      addPage,
      ["addpage", "PublicOnly", "--area", "public", "-P"],
      root,
    );
    await runCommand(
      addPage,
      ["addpage", "UserOnly", "--area", "user", "-P"],
      root,
    );
    let questions: Array<Record<string, unknown>> = [];
    const prompt = (async (input: unknown) => {
      questions = input as Array<Record<string, unknown>>;
      return { page: "user:UserOnly", confirm: false };
    }) as PromptRunner;

    const result = await runCommand(
      rmPage,
      ["rmpage", "--area", "user"],
      root,
      prompt,
    );
    const choices = questions[0].choices as Array<{
      title: string;
      value: string;
    }>;

    expect(choices).toEqual([
      { title: "User > UserOnly", value: "user:UserOnly" },
    ]);
    expect(result).toMatchObject({
      status: "cancelled",
      data: { area: "user", logicalName: "UserOnly" },
    });
    expect(result.events[0].detail).toEqual({ area: "user" });
  });

  test("removes the selected page after interactive confirmation", async () => {
    const root = await projectFixture();
    await runCommand(
      addPage,
      ["addpage", "Sample", "--area", "public", "-Pl"],
      root,
    );
    const prompt = (async () => ({
      page: "public:Sample",
      confirm: true,
    })) as PromptRunner;

    await runCommand(rmPage, ["rmpage"], root, prompt);

    expect(existsSync(path.join(root, "src", "ui", "Sample"))).toBe(false);
  });

  test("generates a nested page with matching UI imports and messages", async () => {
    const root = await projectFixture();

    await runCommand(
      addPage,
      ["addpage", "Parent.Child", "--area", "user", "-Pl"],
      root,
    );
    await runCommand(
      addComponent,
      ["addcomponent", "Widget", "--page", "Parent.Child", "--area", "user"],
      root,
    );

    expect(
      await readFile(
        path.join(
          root,
          "src",
          "app",
          "[locale]",
          "(user)",
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
    await runCommand(
      addPage,
      ["addpage", "account-settings", "--area", "public", "-P"],
      root,
    );
    await runCommand(
      addComponent,
      [
        "addcomponent",
        "status-card",
        "--page",
        "account-settings",
        "--area",
        "public",
      ],
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
          "(public)",
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
    ).toContain('export { trackEvent } from "./track-event";');
    expect(
      await readFile(path.join(root, "messages", "en.ts"), "utf8"),
    ).toContain('import accountSettings from "./en/account-settings.json";');
    expect(
      await readFile(path.join(root, "messages", "en.ts"), "utf8"),
    ).toContain('"account-settings": accountSettings,');

    await runCommand(
      rmPage,
      ["rmpage", "account-settings", "--area", "public"],
      root,
    );
    expect(
      await readFile(path.join(root, "messages", "en.ts"), "utf8"),
    ).not.toContain("accountSettings");
  });

  test("uses the configured import alias for an area-aware page", async () => {
    const root = await projectFixture();
    await writeFile(
      path.join(root, "cnp.config.json"),
      JSON.stringify({ useI18n: true, importAlias: "@core/*" }),
    );

    await runCommand(
      addPage,
      ["addpage", "Aliased", "--area", "public", "-P"],
      root,
    );

    expect(
      await readFile(
        path.join(
          root,
          "src",
          "app",
          "[locale]",
          "(public)",
          "Aliased",
          "page.tsx",
        ),
        "utf8",
      ),
    ).toContain('from "@core/ui/Aliased/page-ui"');
  });

  test("keeps long generated component translations Prettier-compatible", async () => {
    const root = await projectFixture();
    await runCommand(
      addPage,
      ["addpage", "Formatting", "--area", "public", "-P"],
      root,
    );
    await runCommand(
      addComponent,
      [
        "addcomponent",
        "VeryLongGeneratedComponentCard",
        "--page",
        "Formatting",
        "--area",
        "public",
      ],
      root,
    );

    expect(
      await readFile(
        path.join(
          root,
          "src",
          "ui",
          "Formatting",
          "VeryLongGeneratedComponentCard.tsx",
        ),
        "utf8",
      ),
    ).toContain('{t("VeryLongGeneratedComponentCard.title")}\n      </h2>');
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
    await runCommand(
      addPage,
      ["addpage", "Sample", "--area", "public", "-Pl"],
      root,
    );
    const aggregator = path.join(root, "messages", "en.ts");
    const current = await readFile(aggregator, "utf8");
    await writeFile(aggregator, current.replace(/^\s*Sample,\s*$/m, ""));

    await expect(
      runCommand(rmPage, ["rmpage", "Sample", "--area", "public"], root),
    ).rejects.toMatchObject({ code: "INCONSISTENT_LOCALE" });
    expect(existsSync(path.join(root, "messages", "en", "Sample.json"))).toBe(
      true,
    );
    expect(existsSync(path.join(root, "src", "ui", "Sample"))).toBe(true);
    expect(
      existsSync(
        path.join(root, "src", "app", "[locale]", "(public)", "Sample"),
      ),
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

  test("rejects page message symlinks before any route mutation", async () => {
    const root = await projectFixture();
    const outside = await mkdtemp(path.join(tmpdir(), "cnp-outside-"));
    temporaryDirectories.push(outside);
    const outsideMessage = path.join(outside, "Outside.json");
    await writeFile(outsideMessage, '{"preserved":true}\n');
    await symlink(
      outsideMessage,
      path.join(root, "messages", "en", "Unsafe.json"),
    );

    await expect(
      runCommand(
        addPage,
        ["addpage", "Unsafe", "--area", "public", "-P"],
        root,
      ),
    ).rejects.toMatchObject({ code: "UNSAFE_PATH" });
    expect(existsSync(path.join(root, "src", "ui", "Unsafe"))).toBe(false);
    expect(await readFile(outsideMessage, "utf8")).toBe('{"preserved":true}\n');
  });

  test("refuses to remove a page through a symbolic UI directory", async () => {
    const root = await projectFixture();
    await runCommand(
      addPage,
      ["addpage", "Linked", "--area", "user", "-P"],
      root,
    );
    const outside = await mkdtemp(path.join(tmpdir(), "cnp-outside-ui-"));
    temporaryDirectories.push(outside);
    await writeFile(path.join(outside, "sentinel.txt"), "keep");
    const uiDirectory = path.join(root, "src", "ui", "Linked");
    await rm(uiDirectory, { recursive: true });
    await symlink(outside, uiDirectory);

    await expect(
      runCommand(rmPage, ["rmpage", "Linked", "--area", "user"], root),
    ).rejects.toMatchObject({ code: "UNSAFE_PATH" });
    expect(await readFile(path.join(outside, "sentinel.txt"), "utf8")).toBe(
      "keep",
    );
    expect(
      existsSync(
        path.join(
          root,
          "src",
          "app",
          "[locale]",
          "(user)",
          "Linked",
          "page.tsx",
        ),
      ),
    ).toBe(true);
  });
});

describe("addlib transactional barrel preservation", () => {
  async function seedLibrary(
    root: string,
    library: string,
    indexContent: string,
  ): Promise<string> {
    const libraryDirectory = path.join(root, "src", "lib", library);
    await mkdir(libraryDirectory, { recursive: true });
    const indexPath = path.join(libraryDirectory, "index.ts");
    await writeFile(indexPath, indexContent);
    return indexPath;
  }

  test("preserves every existing byte while adding successive modules", async () => {
    const root = await projectFixture();
    const barrels = {
      contracts: [
        "// Provider-neutral contracts",
        'export type { UserId } from "./user-id";',
        'export * from "./errors";',
        "",
      ].join("\n"),
      application: [
        'export { execute } from "./execute";',
        "",
        "// Keep declarations between export blocks.",
        "export const applicationVersion = 1;",
        "",
      ].join("\n"),
      domain: [
        'import type { Entity } from "./entity";',
        "export type { Entity };",
        'export * as errors from "./errors";',
        "",
      ].join("\n"),
      infrastructure: [
        "// Infrastructure adapters\r\n",
        'export { createAdapter } from "./adapter";\r\n',
      ].join(""),
    } as const;

    for (const [library, initial] of Object.entries(barrels)) {
      const indexPath = await seedLibrary(root, library, initial);
      const first = await runCommand(
        addLib,
        ["addlib", `${library}.firstModule`],
        root,
      );
      const second = await runCommand(
        addLib,
        ["addlib", `${library}.secondModule`],
        root,
      );
      const finalContent = await readFile(indexPath, "utf8");

      expect(finalContent.startsWith(initial), library).toBe(true);
      expect(finalContent).toContain(
        'export { firstModule } from "./firstModule";',
      );
      expect(finalContent).toContain(
        'export { secondModule } from "./secondModule";',
      );
      expect(first.data).toMatchObject({
        library,
        module: "firstModule",
        moduleAction: "created",
        indexAction: "updated",
        exportAction: "added",
        exportKind: "value",
      });
      expect(second.data).toMatchObject({
        library,
        module: "secondModule",
        moduleAction: "created",
        indexAction: "updated",
        exportAction: "added",
        exportKind: "value",
      });
      expect(
        second.events.find((event) => event.role === "library-index")?.detail,
      ).toMatchObject({ exportAction: "added", exportKind: "value" });
    }
  });

  test("returns unchanged when the module path is already publicly exported", async () => {
    const root = await projectFixture();
    const initial = [
      "// Preserve this customized barrel.",
      'export type { Primitive } from "./primitives";',
      "",
    ].join("\n");
    const indexPath = await seedLibrary(root, "contracts", initial);
    const modulePath = path.join(
      root,
      "src",
      "lib",
      "contracts",
      "primitives.ts",
    );
    const moduleContent = "export default interface Primitive {}\n";
    await writeFile(modulePath, moduleContent);

    const result = await runCommand(
      addLib,
      ["addlib", "contracts.primitives"],
      root,
    );

    expect(result).toMatchObject({ status: "unchanged", exitCode: 0 });
    expect(result.data).toMatchObject({
      moduleAction: "unchanged",
      indexAction: "unchanged",
      exportAction: "preserved",
      exportKind: "type",
      preservedExportStatements: 1,
    });
    expect(await readFile(indexPath, "utf8")).toBe(initial);
    expect(await readFile(modulePath, "utf8")).toBe(moduleContent);
  });

  test("rejects inconsistent source files before creating a module", async () => {
    const root = await projectFixture();
    const invalidIndex = "export {\n";
    const indexPath = await seedLibrary(root, "contracts", invalidIndex);

    await expect(
      runCommand(addLib, ["addlib", "contracts.primitives"], root),
    ).rejects.toMatchObject({ code: "INCONSISTENT_LIBRARY_INDEX" });
    expect(await readFile(indexPath, "utf8")).toBe(invalidIndex);
    expect(
      existsSync(path.join(root, "src", "lib", "contracts", "primitives.ts")),
    ).toBe(false);
    expect(
      existsSync(path.join(root, ".create-next-pro-addlib-contracts.lock")),
    ).toBe(false);

    const validIndex = 'export { current } from "./current";\n';
    await writeFile(indexPath, validIndex);
    const modulePath = path.join(
      root,
      "src",
      "lib",
      "contracts",
      "primitives.ts",
    );
    const invalidModule = "export function primitives( {\n";
    await writeFile(modulePath, invalidModule);

    await expect(
      runCommand(addLib, ["addlib", "contracts.primitives"], root),
    ).rejects.toMatchObject({ code: "INCONSISTENT_LIBRARY_MODULE" });
    expect(await readFile(indexPath, "utf8")).toBe(validIndex);
    expect(await readFile(modulePath, "utf8")).toBe(invalidModule);
  });

  test("refuses an existing lock without changing the library", async () => {
    const root = await projectFixture();
    const initial = 'export { current } from "./current";\n';
    const indexPath = await seedLibrary(root, "contracts", initial);
    const lockPath = path.join(root, ".create-next-pro-addlib-contracts.lock");
    await writeFile(lockPath, "active\n");

    await expect(
      runCommand(addLib, ["addlib", "contracts.primitives"], root),
    ).rejects.toMatchObject({ code: "CONCURRENT_MODIFICATION" });
    expect(await readFile(indexPath, "utf8")).toBe(initial);
    expect(await readFile(lockPath, "utf8")).toBe("active\n");
    expect(
      existsSync(path.join(root, "src", "lib", "contracts", "primitives.ts")),
    ).toBe(false);
  });

  test("detects an index changed under lock and rolls back the new module", async () => {
    const root = await projectFixture();
    const initial = 'export { current } from "./current";\n';
    const externallyChanged = `${initial}// Concurrent user edit.\n`;
    const indexPath = await seedLibrary(root, "contracts", initial);
    const context = createNodeContext({ cwd: root });
    const originalRead = context.fs.readText;
    let indexReads = 0;
    context.fs = {
      ...context.fs,
      readText: async (target) => {
        if (target === indexPath && ++indexReads === 2) {
          await writeFile(indexPath, externallyChanged);
        }
        return originalRead(target);
      },
    };

    await expect(
      addLib(["addlib", "contracts.primitives"], context),
    ).rejects.toMatchObject({ code: "CONCURRENT_MODIFICATION" });
    expect(await readFile(indexPath, "utf8")).toBe(externallyChanged);
    expect(
      existsSync(path.join(root, "src", "lib", "contracts", "primitives.ts")),
    ).toBe(false);
    expect(context.operations.snapshot()).toHaveLength(0);
  });

  test("rolls back the module when appending the index fails", async () => {
    const root = await projectFixture();
    const initial = 'export { current } from "./current";\n';
    const indexPath = await seedLibrary(root, "application", initial);
    const context = createNodeContext({ cwd: root });
    context.fs = {
      ...context.fs,
      appendText: async () => {
        throw new Error("injected append failure");
      },
    };

    await expect(
      addLib(["addlib", "application.handler"], context),
    ).rejects.toThrow("injected append failure");
    expect(await readFile(indexPath, "utf8")).toBe(initial);
    expect(
      existsSync(path.join(root, "src", "lib", "application", "handler.ts")),
    ).toBe(false);
    expect(
      existsSync(path.join(root, ".create-next-pro-addlib-application.lock")),
    ).toBe(false);
    expect(context.operations.snapshot()).toHaveLength(0);
  });

  test("reports an index changed by a failed append as a residual mutation", async () => {
    const root = await projectFixture();
    const initial = 'export { current } from "./current";\n';
    const indexPath = await seedLibrary(root, "application", initial);
    const context = createNodeContext({ cwd: root });
    const originalAppend = context.fs.appendText;
    context.fs = {
      ...context.fs,
      appendText: async (target, content) => {
        await originalAppend(target, content);
        throw new Error("injected post-append failure");
      },
    };

    await expect(
      addLib(["addlib", "application.handler"], context),
    ).rejects.toMatchObject({ code: "FILESYSTEM_ERROR" });
    expect(await readFile(indexPath, "utf8")).toBe(
      `${initial}\nexport { handler } from "./handler";\n`,
    );
    expect(
      existsSync(path.join(root, "src", "lib", "application", "handler.ts")),
    ).toBe(false);
    expect(context.operations.snapshot()).toContainEqual(
      expect.objectContaining({
        action: "updated",
        role: "library-index",
        detail: { rollbackFailed: true },
      }),
    );
  });

  test("maps an exclusive creation race to a concurrent modification", async () => {
    const root = await projectFixture();
    const initial = 'export { current } from "./current";\n';
    const indexPath = await seedLibrary(root, "domain", initial);
    const context = createNodeContext({ cwd: root });
    const originalWriteExclusive = context.fs.writeTextExclusive;
    const modulePath = path.join(root, "src", "lib", "domain", "policy.ts");
    context.fs = {
      ...context.fs,
      writeTextExclusive: async (target, content) => {
        if (target === modulePath) {
          await writeFile(modulePath, "export const external = true;\n");
        }
        await originalWriteExclusive(target, content);
      },
    };

    await expect(
      addLib(["addlib", "domain.policy"], context),
    ).rejects.toMatchObject({ code: "CONCURRENT_MODIFICATION" });
    expect(await readFile(indexPath, "utf8")).toBe(initial);
    expect(await readFile(modulePath, "utf8")).toBe(
      "export const external = true;\n",
    );
    expect(context.operations.snapshot()).toHaveLength(0);
  });

  test("removes a new library when exclusive index creation fails", async () => {
    const root = await projectFixture();
    const context = createNodeContext({ cwd: root });
    const originalWriteExclusive = context.fs.writeTextExclusive;
    context.fs = {
      ...context.fs,
      writeTextExclusive: async (target, content) => {
        if (target.endsWith(`${path.sep}index.ts`)) {
          throw new Error("injected exclusive index failure");
        }
        await originalWriteExclusive(target, content);
      },
    };

    await expect(addLib(["addlib", "domain.policy"], context)).rejects.toThrow(
      "injected exclusive index failure",
    );
    expect(existsSync(path.join(root, "src", "lib", "domain"))).toBe(false);
    expect(
      existsSync(path.join(root, ".create-next-pro-addlib-domain.lock")),
    ).toBe(false);
    expect(context.operations.snapshot()).toHaveLength(0);
  });

  test("reports residual resources when rollback itself fails", async () => {
    const root = await projectFixture();
    await seedLibrary(
      root,
      "infrastructure",
      'export { current } from "./current";\n',
    );
    const context = createNodeContext({ cwd: root });
    const originalRemove = context.fs.remove;
    const modulePath = path.join(
      root,
      "src",
      "lib",
      "infrastructure",
      "privateNetwork.ts",
    );
    context.fs = {
      ...context.fs,
      appendText: async () => {
        throw new Error("injected append failure");
      },
      remove: async (target, options) => {
        if (target === modulePath) {
          throw new Error("injected rollback failure");
        }
        await originalRemove(target, options);
      },
    };

    await expect(
      addLib(["addlib", "infrastructure.privateNetwork"], context),
    ).rejects.toMatchObject({ code: "FILESYSTEM_ERROR" });
    expect(existsSync(modulePath)).toBe(true);
    expect(context.operations.snapshot()).toContainEqual(
      expect.objectContaining({
        action: "created",
        role: "library-module",
        path: "src/lib/infrastructure/privateNetwork.ts",
        detail: { rollbackFailed: true },
      }),
    );
  });
});
