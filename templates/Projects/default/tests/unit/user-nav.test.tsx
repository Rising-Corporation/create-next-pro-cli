import { describe, expect, test, vi } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import en from "../../messages/en";
import fr from "../../messages/fr";
import UserNav from "../../src/ui/_global/UserNav";

vi.mock("@/lib/i18n/navigation", async () => {
  const { useLocale } = await import("next-intl");
  return {
    Link: ({ href, children, ...props }: React.ComponentProps<"a">) => {
      const locale = useLocale();
      return React.createElement(
        "a",
        { href: `/${locale}${href}`, ...props },
        children,
      );
    },
  };
});

const renderUserNav = (locale: "en" | "fr", messages: typeof en | typeof fr) =>
  renderToStaticMarkup(
    <NextIntlClientProvider
      locale={locale}
      messages={messages}
      onError={() => undefined}
    >
      <UserNav />
    </NextIntlClientProvider>,
  );

describe("UserNav", () => {
  test.each([
    ["en", en, "Toggle theme", "Logout"],
    ["fr", fr, "Changer de thème", "Déconnexion"],
  ] as const)(
    "renders one localized theme control and keeps the %s navigation actions",
    (locale, messages, themeLabel, logoutLabel) => {
      const html = renderUserNav(locale, messages);

      expect(
        html.match(new RegExp(`aria-label="${themeLabel}"`, "g")),
      ).toHaveLength(1);
      expect(html).toContain(`href="/${locale}/dashboard"`);
      expect(html).toContain(`href="/${locale}/settings"`);
      expect(html).toContain(`href="/${locale}/userInfo"`);
      expect(html).toContain(logoutLabel);
    },
  );
});
