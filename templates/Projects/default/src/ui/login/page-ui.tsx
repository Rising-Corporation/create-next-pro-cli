// src/ui/login/page-ui.tsx
"use client";

import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { signIn } from "next-auth/react";
import { siGoogle } from "simple-icons";

export default function LoginPageUI() {
  const t = useTranslations("login");
  const locale = useLocale();

  return (
    <section className="py-8 px-4 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <p className="mt-2">{t("description")}</p>
      <button
        onClick={() => signIn("google", { redirectTo: `/${locale}/dashboard` })}
        className="mt-6 w-full py-2 px-4 rounded bg-[rgb(var(--background))]  font-semibold hover:bg-stone-700 transition"
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
        {t("login_with_google")}
      </button>
    </section>
  );
}
