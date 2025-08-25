import React from "react";

export default function GlobalMain({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="mt-0 min-h-screen bg-neutral-50 font-sans text-gray-900 flex flex-col">
      <div className="flex-1 flex flex-col justify-center items-stretch mx-auto w-full  px-6 self-stretch">
        {children}
      </div>
    </main>
  );
}
