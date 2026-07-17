import { expect, test } from "@playwright/test";

const captureByProject: Record<string, string> = {
  desktop: "artifacts/captures/phase-2-template-integration-desktop.png",
  mobile: "artifacts/captures/phase-2-template-integration-mobile.png",
};

test("public template routes render in both locales", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/(en|fr)$/);
  await expect(page.getByRole("banner")).toBeVisible();

  await page.goto("/en");
  await expect(page.getByRole("banner")).toBeVisible();
  const homeHeading = page
    .getByRole("main")
    .getByRole("heading", { name: "Home" });
  await expect(homeHeading).toBeVisible();
  await page.getByLabel("Toggle theme").click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect(homeHeading).toHaveCSS("color", "rgb(255, 255, 255)");
  await page.getByLabel("Toggle theme").click();
  await expect(page.locator("html")).toHaveClass(/light/);

  await page.goto("/fr/login");
  await expect(page.getByRole("heading", { name: /connexion/i })).toBeVisible();
  await expect(page.getByLabel("Choisir la langue")).toHaveValue("fr");
  await expect(page.locator("html")).toHaveClass(/light/);
  await page.getByLabel("Changer de thème").click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.getByLabel("Changer de thème").click();
  await expect(page.locator("html")).toHaveClass(/light/);

  const capturePath = captureByProject[testInfo.project.name];
  if (capturePath) {
    await page.goto("/fr/login");
    await page.mouse.move(0, 0);
    await page.screenshot({ path: capturePath, fullPage: true });
  }
});

test("anonymous users are redirected away from private pages", async ({
  page,
}) => {
  await page.goto("/en/dashboard");
  await expect(page).toHaveURL(/\/en\/login/);
});

test("security headers and disabled auth are explicit", async ({ request }) => {
  const pageResponse = await request.get("/en");
  const csp = pageResponse.headers()["content-security-policy"];
  expect(csp).toContain("default-src 'self'");
  expect(csp).toContain("script-src 'self' 'unsafe-inline'");
  expect(csp).not.toContain("'unsafe-eval'");
  expect(csp).not.toContain("'nonce-");
  expect(pageResponse.headers()["x-content-type-options"]).toBe("nosniff");

  const authResponse = await request.get("/api/auth/providers");
  expect(authResponse.status()).toBe(503);
  await expect(authResponse.json()).resolves.toEqual({
    error: "Authentication is not configured for this deployment.",
  });
});

test("theme is initialized before hydration without a React warning", async ({
  page,
}) => {
  const hydrationWarnings: string[] = [];
  page.on("console", (message) => {
    if (
      message.type() === "warning" &&
      (message.text().includes("hydrated") ||
        message.text().includes("Encountered a script tag"))
    ) {
      hydrationWarnings.push(message.text());
    }
  });

  await page.addInitScript(() => localStorage.setItem("theme", "dark"));
  await page.goto("/en", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#theme-initializer")).toHaveCount(1);
  await expect(page.locator("html")).toHaveClass(/dark/);
  expect(hydrationWarnings).toEqual([]);
});

test("theme falls back to the system preference", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/en", { waitUntil: "domcontentloaded" });

  await expect(page.locator("html")).toHaveClass(/dark/);
});

test("mobile navigation supports keyboard dismissal", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile");
  await page.goto("/en");
  const menuButton = page.getByRole("button", { name: "Menu" });
  await menuButton.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(menuButton).toBeFocused();
});
