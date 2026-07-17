import React from "react";
import HomePage from "@/app/[locale]/(public)/_home/page";
import GlobalHeader from "@/ui/_global/GlobalHeader";
import GlobalMain from "@/ui/_global/GlobalMain";

export default async function FallbackPage() {
  return (
    <>
      <GlobalHeader hasSessionInitial={false} />
      <GlobalMain>
        <HomePage />
      </GlobalMain>
    </>
  );
}
