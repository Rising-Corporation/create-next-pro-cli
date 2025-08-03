"use client"; // DO NOT FORGET , this is a client component.
import { useRouter } from "next/navigation";

export default function BackButton({ className = "" }: { className?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.back()}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 transition ${className}`}
    >
      <span aria-hidden="true">←</span> Retour
    </button>
  );
}
