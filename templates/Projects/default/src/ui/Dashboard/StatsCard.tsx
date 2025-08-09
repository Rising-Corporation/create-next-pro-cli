import React from "react";

export default function StatsCard({ t }: { t: (key: string) => string }) {
  return (
    <div className="rounded border bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold mb-2">Statistiques</h2>
      <ul className="text-sm text-gray-600 space-y-1">
        <li>• {t("widgets.stats.views")}: 123</li>
        <li>• {t("widgets.stats.likes")}: 45</li>
        <li>• {t("widgets.stats.comments")}: 7</li>
      </ul>
    </div>
  );
}
