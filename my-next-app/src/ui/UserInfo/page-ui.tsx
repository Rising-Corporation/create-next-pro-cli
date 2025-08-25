// src/ui/UserInfo/page-ui.tsx
"use client";

import { useTranslations } from "next-intl";

export default function UserInfoPageUI() {
  const t = useTranslations("UserInfo");

  return (
    <>
      <section className="py-8 px-4 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted mt-2">{t("description")}</p>
      </section>
    </>
  );
}
