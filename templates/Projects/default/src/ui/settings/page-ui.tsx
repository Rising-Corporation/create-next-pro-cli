// src/ui/settings/page-ui.tsx
import { getTranslations } from "next-intl/server";

export default async function SettingsPageUI() {
  const t = await getTranslations("settings");

  return (
    <>
      <section className="py-8 px-4 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="mt-2">{t("description")}</p>
      </section>
    </>
  );
}
