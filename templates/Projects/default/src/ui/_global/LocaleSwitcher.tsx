"use client"; // DO NOT FORGET , this is a client component.
import { useRouter, usePathname } from "next/navigation";
import { useParams } from "next/navigation";

const locales = [
  { code: "fr", label: "Français" },
  { code: "en", label: "English" },
];

export default function LocaleSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const currentLocale = params?.locale || "fr";

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLocale = e.target.value;
    if (newLocale === currentLocale) return;
    // Replace locale in pathname
    const newPath = pathname.replace(`/${currentLocale}`, `/${newLocale}`);
    router.push(newPath);
  };

  return (
    <select
      className="ml-2 ring rounded px-2 py-1 text-sm  dark:bg-gray-800 dark:text-gray-200"
      value={currentLocale}
      onChange={handleChange}
      aria-label="Select language"
    >
      {locales.map((l) => (
        <option key={l.code} value={l.code}>
          {l.label}
        </option>
      ))}
    </select>
  );
}
