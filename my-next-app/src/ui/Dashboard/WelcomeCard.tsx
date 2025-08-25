import React from "react";

export default function WelcomeCard({ t }: { t: (key: string) => string }) {
  return (
    <div className="rounded border bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold mb-2">{t("widgets.welcome")}</h2>
      <p className="text-gray-600">{t("widgets.description")}</p>
    </div>
  );
}
