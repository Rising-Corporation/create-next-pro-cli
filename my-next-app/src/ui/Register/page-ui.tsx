// src/ui/Register/page-ui.tsx
"use client";

import { useTranslations } from "next-intl";
import { signIn } from "next-auth/react";
import BackButton from "@/ui/_global/BackButton";

export default function RegisterPageUI() {
  const t = useTranslations("Register");

  return (
    <section className="py-8 px-4 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <BackButton />
      </div>
      <p className="text-muted mb-6">{t("description")}</p>
      <button
        onClick={() => signIn()}
        className="w-full py-2 px-4 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
      >
        {t("register_with_google")}
      </button>
    </section>
  );
}
