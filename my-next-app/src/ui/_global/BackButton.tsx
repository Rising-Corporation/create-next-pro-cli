"use client"; // DO NOT FORGET , this is a client component.
import { useRouter } from "next/navigation";
import { StepBackIcon } from "lucide-react";
import { Button } from "./Button";

export default function BackButton({ className = "" }: { className?: string }) {
  const router = useRouter();
  return (
    <Button
      type="button"
      onClick={() => router.back()}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 transition ${className}`}
    >
      <StepBackIcon className="h-4 w-4" /> Retour
    </Button>
  );
}
