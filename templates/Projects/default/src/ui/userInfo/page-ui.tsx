// src/ui/userInfo/page-ui.tsx
import { getTranslations } from "next-intl/server";

export default async function UserInfoPageUI() {
  const t = await getTranslations("userInfo");

  return (
    <>
      <section className="py-8 px-4 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="mt-2">{t("description")}</p>
      </section>
    </>
  );
}
