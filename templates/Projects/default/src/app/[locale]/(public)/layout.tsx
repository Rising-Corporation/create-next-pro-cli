import React from "react";
import GlobalHeader from "@/ui/_global/GlobalHeader";
import GlobalMain from "@/ui/_global/GlobalMain";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <GlobalHeader hasSessionInitial={false} />
      <GlobalMain>{children}</GlobalMain>
    </>
  );
}
