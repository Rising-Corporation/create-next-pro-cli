// src/ui/settings/page-ui.tsx
import { getTranslations } from "next-intl/server";
import LocaleSwitcher from "@/ui/_global/LocaleSwitcher";
import ThemeToggle from "@/ui/_global/ThemeToggle";

export default async function SettingsPageUI() {
  const t = await getTranslations("settings");

  return (
    <section className="py-8 px-4 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <p className="mt-2">{t("description")}</p>

      <div className="mt-8 grid gap-6">
        <section
          className="rounded border bg-white p-6 shadow-sm dark:bg-black"
          aria-labelledby="language-preference-title"
        >
          <div className="flex items-center justify-between gap-6">
            <div>
              <h2
                id="language-preference-title"
                className="text-lg font-semibold"
              >
                {t("language.title")}
              </h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                {t("language.description")}
              </p>
            </div>
            <LocaleSwitcher />
          </div>
        </section>

        <section
          className="rounded border bg-white p-6 shadow-sm dark:bg-black"
          aria-labelledby="theme-preference-title"
        >
          <div className="flex items-center justify-between gap-6">
            <div>
              <h2 id="theme-preference-title" className="text-lg font-semibold">
                {t("theme.title")}
              </h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                {t("theme.description")}
              </p>
            </div>
            <ThemeToggle />
          </div>
        </section>
      </div>
    </section>
  );
}
