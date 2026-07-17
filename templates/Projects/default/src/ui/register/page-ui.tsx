// src/ui/register/page-ui.tsx
"use client";

import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { signIn } from "next-auth/react";
import { siGoogle } from "simple-icons";

export default function RegisterPageUI() {
  const t = useTranslations("register");
  const locale = useLocale();

  return (
    <section className="py-8 px-4 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
      </div>
      <p className="mb-6">{t("description")}</p>
      <button
        onClick={() => signIn("google", { redirectTo: `/${locale}/dashboard` })}
        className="w-full py-2 px-4 rounded font-semibold bg-[rgb(var(--background))] hover:bg-[rgb(var(--secondary))] transition"
      >
        <svg
          role="img"
          viewBox="0 0 24 24"
          width="25"
          height="25"
          aria-label={siGoogle.title}
          fill={`#${siGoogle.hex}`}
          className="inline-block mr-4"
        >
          <path d={siGoogle.path} />
        </svg>
        {t("register_with_google")}
      </button>
    </section>
  );
}
