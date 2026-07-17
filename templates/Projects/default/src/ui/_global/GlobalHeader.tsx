import Image from "next/image";
import UserNav from "@/ui/_global/UserNav";
import LocaleSwitcher from "@/ui/_global/LocaleSwitcher";
import PublicNav from "@/ui/_global/PublicNav";
import { Link } from "@/lib/i18n/navigation";

type GlobalHeaderProps = {
  hasSessionInitial: boolean;
};

export default function GlobalHeader({ hasSessionInitial }: GlobalHeaderProps) {
  return (
    <header className="fixed top-0 z-50 w-full border-b bg-background/80 glass-effect">
      <div className="mx-auto grid h-16 max-w-6xl grid-cols-[auto_1fr_auto] items-center gap-2 px-3 sm:px-4 md:px-6">
        <Link href="/" aria-label="Create Next Pro home" className="min-w-0">
          <div className="flex h-16 min-w-0 items-center">
            <Image
              src="/logo.svg"
              alt="Logo"
              width={63}
              height={63}
              className="mr-2 h-11 w-11 sm:h-[52px] sm:w-[52px] md:h-[63px] md:w-[63px]"
            />
            <h1 className="hidden whitespace-nowrap text-base font-semibold tracking-tight select-none sm:block md:text-lg">
              Create Next Pro
            </h1>
          </div>
        </Link>

        {hasSessionInitial ? <UserNav /> : <PublicNav />}
        <div className="flex items-center h-16">
          <LocaleSwitcher />
        </div>
      </div>
    </header>
  );
}
