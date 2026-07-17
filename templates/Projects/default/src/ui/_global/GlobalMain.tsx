import React from "react";

export default function GlobalMain({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="mt-0 flex min-h-screen flex-col bg-neutral-50 text-foreground font-sans hero-pattern">
      <div className="flex-1 flex flex-col justify-center items-stretch mx-auto w-full  px-6 self-stretch">
        {children}
      </div>
    </main>
  );
}
