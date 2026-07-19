"use client";
import { Link } from "@/lib/i18n/navigation";
import { useTranslations } from "next-intl";
import LogoutButton from "../dashboard/LogoutButton";
import ThemeToggle from "./ThemeToggle";

const navLinks = [
  { href: "/dashboard", labelKey: "user_nav.links.dashboard" },
  { href: "/settings", labelKey: "user_nav.links.settings" },
  { href: "/userInfo", labelKey: "user_nav.links.user_info" },
];

const UserNav = () => {
  const t = useTranslations("_global_ui");
  return (
    <nav aria-label="User navigation">
      <ul className="flex gap-2 md:gap-4 h-16 items-center">
        {navLinks.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="inline-block rounded px-3 py-1.5 text-sm font-medium dark:text-stone-100 light:text-stone-900 hover:text-stone-600 hover:bg-stone-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-500"
            >
              {t(link.labelKey)}
            </Link>
          </li>
        ))}
        <li>
          <ThemeToggle />
        </li>
        <li>
          <LogoutButton />
        </li>
      </ul>
    </nav>
  );
};

export default UserNav;
