"use client";
import { Link } from "@/lib/i18n/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState, useRef } from "react";
import { Button } from "@/ui/_global/Button";
import ThemeToggle from "@/ui/_global/ThemeToggle";
import { Menu, X } from "lucide-react";

const navLinks = [
  { href: "/", labelKey: "public_nav.links.home" },
  { href: "/login", labelKey: "public_nav.links.login" },
  { href: "/register", labelKey: "public_nav.links.register" },
];

const PublicNav = () => {
  const t = useTranslations("_global_ui");
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      firstLinkRef.current?.focus();
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && open) {
        setOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open]);

  return (
    <nav aria-label="Public navigation" className="justify-self-end">
      <div className="flex h-16 items-center gap-1 sm:gap-2">
        <ul className="hidden items-center gap-2 md:flex lg:gap-4">
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="inline-block rounded px-3 py-1.5 text-sm font-medium dark:text-stone-100 light:text-stone-900 dark:hover:bg-white/10 light:hover:bg-black/10 transition-colors focus:outline-none focus-visible:ring-2"
              >
                {t(link.labelKey)}
              </Link>
            </li>
          ))}
        </ul>
        <div className="flex items-center">
          <ThemeToggle />
        </div>
        <div className="flex items-center md:hidden">
          <Button
            ref={menuButtonRef}
            variant="ghost"
            size="icon"
            className="focus:outline-none"
            onClick={() => setOpen((o) => !o)}
            aria-label="Menu"
            aria-expanded={open}
            aria-controls="public-mobile-menu"
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" aria-hidden="true" />
          <div
            id="public-mobile-menu"
            ref={menuRef}
            role="dialog"
            aria-modal="true"
            aria-label={t("public_nav.menu")}
            className="mobil-menu absolute top-20 left-1/2 z-50 flex w-11/12 max-w-xs -translate-x-1/2 flex-col gap-2 rounded-xl p-4 shadow-lg animate-fade-in"
          >
            <Link ref={firstLinkRef} href="/" onClick={() => setOpen(false)}>
              <Button
                variant="ghost"
                className="w-full justify-center cursor-pointer glass-effect"
              >
                {t("public_nav.links.home")}
              </Button>
            </Link>
            <Link href="/login" onClick={() => setOpen(false)}>
              <Button
                variant="ghost"
                className="w-full justify-center cursor-pointer glass-effect"
              >
                {t("public_nav.links.login")}
              </Button>
            </Link>
            <Link href="/register" onClick={() => setOpen(false)}>
              <Button
                className="w-full justify-center cursor-pointer"
                variant="ghost"
              >
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
