"use client"; // DO NOT FORGET , this is a client component.
import { Link } from "@/lib/i18n/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState, useRef } from "react";
import { Button } from "@/ui/_global/Button";
import ThemeToggle from "@/ui/_global/ThemeToggle";
import { Menu, X } from "lucide-react";

const navLinks = [
  { href: "/", labelKey: "public_nav.links.home" },
  { href: "/Login", labelKey: "public_nav.links.login" },
  { href: "/Register", labelKey: "public_nav.links.register" },
];

const PublicNav = () => {
  const t = useTranslations("_global_ui");
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  return (
    <nav aria-label="Public navigation">
      <div className="flex justify-between items-center h-16">
        <ul className="flex gap-2 md:gap-4 hidden md:flex items-center space-x-4">
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="inline-block rounded px-3 py-1.5 text-sm font-medium dark:text-gray-400 light:text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                {t(link.labelKey)}
              </Link>
            </li>
          ))}
        </ul>
        <div className="flex items-center space-x-4">
          <ThemeToggle />
        </div>
        <div className="md:hidden flex items-center">
          <Button
            variant="default"
            onClick={() => setOpen((o) => !o)}
            className="focus:outline-none"
            aria-label="Menu"
          >
            {open ? <X className="h-7 w-7" /> : <Menu className="h-7 w-7" />}
          </Button>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" aria-hidden="true" />
          <div
            ref={menuRef}
            className="mobil-menu absolute top-4 left-1/2 -translate-x-1/2 flex flex-col gap-2  rounded-xl p-4 shadow-lg animate-fade-in z-50 w-11/12 max-w-xs"
          >
            <Link href="/Login" onClick={() => setOpen(false)}>
              <Button
                variant="ghost"
                className="w-full text-white justify-center hover:text-blue-300  cursor-pointer glass-effect"
              >
                {t("public_nav.links.login")}
              </Button>
            </Link>
            <Link href="/Register" onClick={() => setOpen(false)}>
              <Button className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 justify-center cursor-pointer">
                {t("public_nav.links.register")}
              </Button>
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
};
export default PublicNav;
