"use client";
import Image from "next/image";
import UserNav from "@/ui/_global/UserNav";
import LocaleSwitcher from "@/ui/_global/LocaleSwitcher";
import PublicNav from "@/ui/_global/PublicNav";
import { useEffect, useState } from "react";
import { Link } from "@/lib/i18n/navigation";
import { isConnected } from "@/lib/auth/isConnected";

type GlobalHeaderProps = {
  isConnectedInitial: boolean;
};

export default function GlobalHeader({
  isConnectedInitial,
}: GlobalHeaderProps) {
  const [isConnectedState, setIsConnectedState] = useState(isConnectedInitial);

  // Vérification dynamique côté client (exemple via /api/me)
  useEffect(() => {
    async function checkConnection() {
      setIsConnectedState(await isConnected());
    }
    checkConnection();
    // Optionnel : timer pour rafraîchir périodiquement
    // const interval = setInterval(checkConnection, 60000);
    // return () => clearInterval(interval);
  }, []);

  return (
    <header className="fixed top-0 w-full z-50 glass-effect border-b">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="">
          <div className="flex items-center h-16">
            <Image
              src="/cnp-logo.svg"
              alt="Logo"
              width={63}
              height={63}
              className="mr-2"
            />
            <h1 className="text-lg font-semibold tracking-tight select-none">
              Create Next Pro
            </h1>
          </div>
        </Link>

        {isConnectedState ? <UserNav /> : <PublicNav />}
        <div className="flex items-center h-16">
          <LocaleSwitcher />
        </div>
      </div>
    </header>
  );
}
