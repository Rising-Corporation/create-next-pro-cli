"use client"; // DO NOT FORGET , this is a client component.
import { Link } from "@/lib/i18n/navigation";
import { useTranslations } from "next-intl";

const navLinks = [
  { href: "/", labelKey: "public_nav.links.home" },
  { href: "/login", labelKey: "public_nav.links.login" },
  { href: "/register", labelKey: "public_nav.links.register" },
];

const PublicNav = () => {
  const t = useTranslations("_global_ui");
  return (
    <nav aria-label="Public navigation">
      <ul className="flex gap-2 md:gap-4">
        {navLinks.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="inline-block rounded px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              {t(link.labelKey)}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
};
export default PublicNav;
