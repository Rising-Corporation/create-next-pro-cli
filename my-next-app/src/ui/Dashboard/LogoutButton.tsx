// src/ui/Dashboard/LogoutButton.tsx
"use client"; // DO NOT FORGET , this is a client component.
import { useTranslations } from "next-intl";
import { Button } from "@/ui/_global/Button";
import { LogOut } from "lucide-react";
import { disconnect } from "@/lib/auth/disconnect";

const LogoutButton = () => {
  const t = useTranslations("Dashboard");
  const handleLogout = () => {
    disconnect().then(() => {
      window.location.href = "/";
    });
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
