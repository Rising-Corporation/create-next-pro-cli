// src/ui/dashboard/LogoutButton.tsx
"use client";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { signOut } from "next-auth/react";
import { Button } from "@/ui/_global/Button";
import { LogOut } from "lucide-react";

const LogoutButton = () => {
  const t = useTranslations("dashboard");
  const locale = useLocale();

  const handleLogout = () => {
    void signOut({ redirectTo: `/${locale}` });
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleLogout}
      className="text-gray-400 hover:text-black  glass-effect"
    >
      <LogOut className="h-4 w-4 sm:mr-2" />
      <span className="hidden sm:inline">{t("logout")}</span>
    </Button>
  );
};
export default LogoutButton;
