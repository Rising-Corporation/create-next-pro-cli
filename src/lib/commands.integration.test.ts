import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, test } from "vitest";

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

    await rmPage(["rmpage", "Sample"], root);
    expect(existsSync(path.join(root, "src", "ui", "Sample"))).toBe(false);
    expect(
      existsSync(path.join(root, "src", "app", "[locale]", "Sample")),
    ).toBe(false);
    expect(await readFile(path.join(root, "preserved.txt"), "utf8")).toBe(
      "keep",
    );
  });
});
