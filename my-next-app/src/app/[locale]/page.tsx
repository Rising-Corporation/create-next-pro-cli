import React from "react";
import HomePage from "@/app/[locale]/(public)/_home/page";

export default async function FallbackPage() {
  return <HomePage />;
}
