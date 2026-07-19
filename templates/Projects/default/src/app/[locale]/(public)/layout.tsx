import React from "react";
import GlobalHeader from "@/ui/_global/GlobalHeader";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <GlobalHeader hasSessionInitial={false} />
      {children}
    </>
  );
}
