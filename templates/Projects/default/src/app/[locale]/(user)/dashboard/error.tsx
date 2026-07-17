// app/[locale]/error.tsx
"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("_global_ui.error");
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div>
      <h2>{t("title")}</h2>
      <button onClick={() => reset()}>{t("retry")}</button>
    </div>
  );
}
