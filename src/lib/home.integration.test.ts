import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import {
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, test } from "vitest";

import type { CommandHandler } from "../core/contracts";
import { discoverPageCatalog } from "../core/page-catalog";
import { createNodeContext } from "../runtime/node-context";
import { scaffoldProject } from "../scaffold";
import { addApi } from "./addApi";
import { addComponent } from "./addComponent";
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

async function fixture() {
  const parent = await mkdtemp(path.join(tmpdir(), "cnp-home-"));
  temporaryDirectories.push(parent);
  const { projectRoot } = await scaffoldProject(
    {
      projectName: "app",
      useTypescript: true,
      useEslint: true,
      useTailwind: true,
      useSrcDir: true,
      useTurbopack: true,
      useI18n: true,
      customAlias: true,
      importAlias: "@/*",
    },
    { context: createNodeContext({ cwd: parent, outputMode: "json" }) },
  );
  return projectRoot;
}

async function snapshot(root: string) {
  const entries = await readdir(root, { recursive: true, withFileTypes: true });
  return Object.fromEntries(
    await Promise.all(
      entries.map(async (entry) => {
        const target = path.join(entry.parentPath, entry.name);
        const value = entry.isFile()
          ? createHash("sha256")
              .update(await readFile(target))
              .digest("hex")
          : entry.isSymbolicLink()
            ? "symlink"
            : "directory";
        return [path.relative(root, target), value];
      }),
    ),
  );
}

function context(root: string) {
  return createNodeContext({ cwd: root, outputMode: "json" });
}

const heroArgs = [
  "addcomponent",
  "Hero",
  "--page",
  "_home",
  "--area",
  "public",
];

describe("limited built-in home exception", () => {
  test("updates existing home translations without changing other resources", async () => {
    const root = await fixture();
    const before = await snapshot(root);
    const args = ["addtext", "_home.title", "Updated home"];
    const result = await addText(args, context(root));

    expect(result.status).toBe("success");
    expect(result.events).toHaveLength(2);
    for (const locale of ["en", "fr"]) {
      expect(result.events).toContainEqual(
        expect.objectContaining({
          action: "updated",
          path: `messages/${locale}/_home.json`,
          detail: { locale, key: "_home.title", replaced: true },
        }),
      );
      const messages = JSON.parse(
        await readFile(
          path.join(root, "messages", locale, "_home.json"),
          "utf8",
        ),
      );
      expect(messages.title).toBe("Updated home");
      expect(messages.github.project_credit).toBeTruthy();
    }
    const after = await snapshot(root);
    expect(
      Object.keys(after)
        .filter((key) => before[key] !== after[key])
        .sort(),
    ).toEqual(["messages/en/_home.json", "messages/fr/_home.json"]);
    expect((await addText(args, context(root))).status).toBe("unchanged");
    expect(await snapshot(root)).toEqual(after);

    await addText(["addtext", "_home.github.star", "Favorite"], context(root));
    for (const locale of ["en", "fr"]) {
      const messages = JSON.parse(
        await readFile(
          path.join(root, "messages", locale, "_home.json"),
          "utf8",
        ),
      );
      expect(messages.github.star).toBe("Favorite");
      expect(messages.github.watch).toBe("Watch");
    }
  });

  test("keeps home literal and rejects every other leading underscore scope", async () => {
    const root = await fixture();
    const original = await readFile(path.join(root, "messages/en/_home.json"));
    await addText(["addtext", "home.title", "Ordinary home"], context(root));
    expect(await readFile(path.join(root, "messages/en/_home.json"))).toEqual(
      original,
    );
    expect(
      JSON.parse(
        await readFile(path.join(root, "messages/en/home.json"), "utf8"),
      ),
    ).toEqual({ title: "Ordinary home" });
    const before = await snapshot(root);
    for (const name of [
      "_home",
      "_home.",
      "_home..title",
      "_home._title",
      "_home._home.title",
      "_home.__proto__.polluted",
      "_home/escape.title",
      "_home.../escape",
      "_home.title/escape",
      "_home.title\\escape",
      "_home.title\u0000",
      "_homeOther.title",
      "_Home.title",
      "__home.title",
      "_global_ui.title",
      "_other.title",
      "home._home.title",
    ]) {
      const ctx = context(root);
      await expect(
        addText(["addtext", name, "Rejected"], ctx),
      ).rejects.toMatchObject({ code: "INVALID_ARGUMENT" });
      expect(ctx.operations.snapshot()).toEqual([]);
    }
    expect(await snapshot(root)).toEqual(before);
  });

  test("adds home components without overwriting the index or existing code", async () => {
    const root = await fixture();
    const before = await snapshot(root);
    const result = await addComponent(heroArgs, context(root));
    expect(result).toMatchObject({
      status: "success",
      data: { area: "public", componentName: "Hero", page: "_home" },
    });
    const file = path.join(root, "src/ui/_home/Hero.tsx");
    expect(await readFile(file, "utf8")).toContain('useTranslations("_home")');
    for (const locale of ["en", "fr"]) {
      expect(
        JSON.parse(
          await readFile(
            path.join(root, "messages", locale, "_home.json"),
            "utf8",
          ),
        ),
      ).toHaveProperty("Hero.title");
    }
    const after = await snapshot(root);
    expect(
      Object.keys(after)
        .filter((key) => before[key] !== after[key])
        .sort(),
    ).toEqual([
      "messages/en/_home.json",
      "messages/fr/_home.json",
      "src/ui/_home/Hero.tsx",
    ]);
    const custom = "export default function Hero() { return null; }\n";
    await writeFile(file, custom);
    expect((await addComponent(heroArgs, context(root))).status).toBe(
      "unchanged",
    );
    expect(await readFile(file, "utf8")).toBe(custom);
    const catalog = await discoverPageCatalog(root, context(root).fs);
    expect(
      catalog.candidates.some((page) => page.logicalName === "_home"),
    ).toBe(false);
  });

  test("does not extend home support to other page areas or commands", async () => {
    const root = await fixture();
    const before = await snapshot(root);
    const cases: Array<[CommandHandler, string[], string]> = [
      [
        addComponent,
        ["addcomponent", "Hero", "--page", "_home"],
        "INVALID_ARGUMENT",
      ],
      ...["user", "admin"].map((area): [CommandHandler, string[], string] => [
        addComponent,
        ["addcomponent", "Hero", "--page", "_home", "--area", area],
        "TARGET_NOT_FOUND",
      ]),
      ...["_global_ui", "_other", "_home.Child", "_Home"].map(
        (page): [CommandHandler, string[], string] => [
          addComponent,
          ["addcomponent", "Hero", "--page", page, "--area", "public"],
          "INVALID_ARGUMENT",
        ],
      ),
      [
        addComponent,
        ["addcomponent", "Hero", "--page", "home", "--area", "public"],
        "TARGET_NOT_FOUND",
      ],
      [addComponent, ["addcomponent", "_home"], "INVALID_ARGUMENT"],
      [addPage, ["addpage", "_home", "--area", "public"], "INVALID_ARGUMENT"],
      [rmPage, ["rmpage", "_home", "--area", "public"], "INVALID_ARGUMENT"],
      [addApi, ["addapi", "_home"], "INVALID_ARGUMENT"],
      [addLib, ["addlib", "_home.feature"], "INVALID_ARGUMENT"],
    ];
    for (const [handler, args, code] of cases) {
      const ctx = context(root);
      await expect(handler(args, ctx)).rejects.toMatchObject({ code });
      expect(ctx.operations.snapshot()).toEqual([]);
    }
    expect(await snapshot(root)).toEqual(before);
  });

  test.each([
    "src/app/[locale]/page.tsx",
    "src/app/[locale]/(public)/_home/page.tsx",
    "src/ui/_home",
  ])(
    "requires the existing home resource %s before component writes",
    async (relative) => {
      const root = await fixture();
      await rm(path.join(root, relative), { recursive: true });
      const before = await snapshot(root);
      const ctx = context(root);
      await expect(addComponent(heroArgs, ctx)).rejects.toMatchObject({
        code: "TARGET_NOT_FOUND",
        path: relative,
      });
      expect(ctx.operations.snapshot()).toEqual([]);
      expect(await snapshot(root)).toEqual(before);
    },
  );

  test.each([
    "src/app/[locale]/page.tsx",
    "src/app/[locale]/(public)/_home",
    "src/ui/_home",
    "messages/fr/_home.json",
  ])("rejects a home symlink at %s before any writes", async (relative) => {
    const root = await fixture();
    const target = path.join(root, relative);
    const outside = path.join(path.dirname(root), "outside");
    await rename(target, outside);
    await symlink(outside, target);
    const before = await snapshot(root);
    const ctx = context(root);
    await expect(addComponent(heroArgs, ctx)).rejects.toMatchObject({
      code: "UNSAFE_PATH",
    });
    expect(ctx.operations.snapshot()).toEqual([]);
    expect(await snapshot(root)).toEqual(before);
    expect(existsSync(path.join(outside, "Hero.tsx"))).toBe(false);
    if (relative.startsWith("messages")) {
      const textContext = context(root);
      await expect(
        addText(["addtext", "_home.title", "Rejected"], textContext),
      ).rejects.toMatchObject({ code: "UNSAFE_PATH" });
      expect(textContext.operations.snapshot()).toEqual([]);
      expect(await snapshot(root)).toEqual(before);
    }
  });

  test("does not partially update home messages when another locale is invalid", async () => {
    const root = await fixture();
    await writeFile(path.join(root, "messages/fr/_home.json"), "invalid json");
    const before = await snapshot(root);
    for (const [handler, args] of [
      [addText, ["addtext", "_home.title", "Rejected"]],
      [addComponent, heroArgs],
    ] satisfies Array<[CommandHandler, string[]]>) {
      const ctx = context(root);
      await expect(handler(args, ctx)).rejects.toMatchObject({
        code: "FILESYSTEM_ERROR",
      });
      expect(ctx.operations.snapshot()).toEqual([]);
    }
    expect(await snapshot(root)).toEqual(before);
  });
});
