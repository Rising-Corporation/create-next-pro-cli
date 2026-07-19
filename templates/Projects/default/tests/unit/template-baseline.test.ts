import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { describe, expect, test } from "vitest";

const root = fileURLToPath(new URL("../../", import.meta.url));

async function source(relativePath: string) {
  return readFile(path.join(root, relativePath), "utf8");
}

describe("updated template baseline", () => {
  test.each([
    ["src/lib/github/repository.ts", "getGitHubRepositoryStats"],
    ["src/ui/_home/GitHubActions.tsx", "GITHUB_REPOSITORY_URL"],
    ["src/ui/_home/page-shell.tsx", "Empowered by Rising Corporation"],
    ["src/ui/_global/UserNav.tsx", "ThemeToggle"],
    ["next.config.ts", "lh3.googleusercontent.com"],
    ["tests/e2e/template-remediation.playwright.ts", "Read the Doc"],
  ])("preserves %s", async (relativePath, marker) => {
    await expect(source(relativePath)).resolves.toContain(marker);
  });

  test.each(["en", "fr"])(
    "preserves the updated %s home messages",
    async (locale) => {
      const messages = JSON.parse(
        await source(`messages/${locale}/_home.json`),
      ) as Record<string, unknown>;
      expect(messages).toHaveProperty("readme");
      expect(messages).toHaveProperty("github");
    },
  );

  test("keeps a complete canonical authentication example without exposing values", async () => {
    const variables = new Map<string, string>();
    for (const line of (await source(".env.example")).split(/\r?\n/)) {
      if (!line || /^\s*#/.test(line)) continue;
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
      if (!match) continue;
      variables.set(match[1], match[2].trim().replace(/\s+#.*$/, ""));
    }

    const configuredAuthValues = [
      variables.get("AUTH_SECRET") ?? variables.get("NEXTAUTH_SECRET"),
      variables.get("AUTH_GOOGLE_ID") ?? variables.get("GOOGLE_CLIENT_ID"),
      variables.get("AUTH_GOOGLE_SECRET") ??
        variables.get("GOOGLE_CLIENT_SECRET"),
    ].filter(Boolean);
    expect(configuredAuthValues).toHaveLength(3);
  });
});
