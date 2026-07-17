"use client";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/lib/i18n/navigation";

const locales = [
  { code: "fr", label: "Français" },
  { code: "en", label: "English" },
];

export default function LocaleSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const currentLocale = useLocale();
  const t = useTranslations("_global_ui");

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLocale = e.target.value;
    if (newLocale === currentLocale) return;

    router.replace(pathname, { locale: newLocale });
  };

  return (
    <select
      className="w-[7.5rem] rounded px-2 py-1 text-sm ring dark:bg-stone-800 dark:text-gray-200 light:bg-stone-200 light:text-stone-800 sm:w-auto"
      value={currentLocale}
      onChange={handleChange}
      aria-label={t("select_language")}
    >
      {locales.map((l) => (
        <option key={l.code} value={l.code}>
          {l.label}
        </option>
      ))}
    </select>
  );
}
