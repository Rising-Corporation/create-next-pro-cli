import Image from "next/image";
import UserNav from "@/ui/_global/UserNav";
import LocaleSwitcher from "@/ui/_global/LocaleSwitcher";
import PublicNav from "@/ui/_global/PublicNav";

export default function GlobalHeader({
  isConnected,
}: {
  isConnected: boolean;
}) {
  return (
    <header className="sticky top-0 z-30 w-full border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 shadow-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <div className="flex items-center gap-3">
          {/* Logo Next.js SVG */}
          <Image
            src="/cnp-logo.svg"
            alt="Logo"
            width={63}
            height={63}
            className="mr-2"
          />
          <span className="text-lg font-semibold tracking-tight select-none">
            Create Next Pro
          </span>
        </div>
        <nav className="flex items-center gap-4">
          {isConnected ? <UserNav /> : <PublicNav />}
          <LocaleSwitcher />
        </nav>
      </div>
    </header>
  );
}
