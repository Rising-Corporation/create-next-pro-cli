import React from "react";
import HomePage from "@/app/[locale]/(public)/_home/page";
import GlobalHeader from "@/ui/_global/GlobalHeader";

export default async function FallbackPage() {
  return (
    <>
      <GlobalHeader hasSessionInitial={false} />
      <HomePage />
    </>
  );
}
