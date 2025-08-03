import React from "react";

export default function GlobalMain({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-neutral-50 font-sans text-gray-900">
      <section className="mx-auto w-full max-w-3xl py-16 px-6">
        {children}
      </section>
    </main>
  );
}
