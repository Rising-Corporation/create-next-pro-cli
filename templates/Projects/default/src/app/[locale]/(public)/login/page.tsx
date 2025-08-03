"use client";
import { useTranslations } from "next-intl";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  const t = useTranslations("login");
  return (
    <main className="py-8 px-4 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <p className="text-muted mt-2">{t("description")}</p>
      <button
        onClick={() => signIn("google")}
        className="mt-6 w-full py-2 px-4 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
      >
        {t("login_with_google")}
      </button>
    </main>
  );
}
