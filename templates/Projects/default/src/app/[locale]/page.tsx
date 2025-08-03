import React from "react";
import Image from "next/image";
import HomePage from "@/app/[locale]/(public)/_home/page";
import DashboardPage from "@/app/[locale]/(user)/dashboard/page";
import PublicNav from "@/ui/_global/PublicNav";
import UserNav from "@/ui/_global/UserNav";
import LocaleSwitcher from "@/ui/_global/LocaleSwitcher";
import { cookies } from "next/headers";
import { verify } from "jsonwebtoken";

export default async function FallbackPage() {
  let isConnected = false;
  const cookieStore = await cookies();
  const appToken = cookieStore.get("app_token")?.value;
  if (appToken) {
    try {
      verify(appToken, process.env.APP_JWT_SECRET!);
      isConnected = true;
    } catch {
      isConnected = false;
    }
  }

  return (
    <HomePage />
    /*     <main className="min-h-screen bg-neutral-50 font-sans text-gray-900">
      <header className="sticky top-0 z-30 w-full border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 shadow-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
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

      <section className="mx-auto w-full max-w-3xl py-16 px-6">
        {isConnected ? <DashboardPage /> : <HomePage />}
      </section>
    </main> */
  );
}

// Design inspiré de nextjs.org avec Tailwind CSS.

// import React from "react";
// import HomePage from "@/app/[locale]/(public)/_home/page";
// import DashboardPage from "@/app/[locale]/(user)/dashboard/page";
// import PublicNav from "@/ui/_global/PublicNav";
// import UserNav from "@/ui/_global/UserNav";
// import LocaleSwitcher from "@/ui/_global/LocaleSwitcher";

// export default async function FallbackPage({
//   params,
// }: {
//   params: Promise<{ locale: string }>;
// }) {
//   // TODO: Remplacer par la logique réelle d'authentification (next-auth)
//   const isConnected = false;
//   const { locale } = await params;

//   return (
//     <main className="min-h-screen bg-neutral-50 font-sans text-gray-900">
//       {/* Header sticky façon nextjs.org */}
//       <header className="sticky top-0 z-30 w-full border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 shadow-sm">
//         <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
//           <div className="flex items-center gap-3">
//             {/* Logo Next.js SVG */}
//             <svg
//               width="32"
//               height="32"
//               viewBox="0 0 32 32"
//               fill="none"
//               xmlns="http://www.w3.org/2000/svg"
//               className="mr-2"
//             >
//               <rect width="32" height="32" rx="16" fill="#000" />
//               <path
//                 d="M16.018 29.917c7.66 0 13.899-6.238 13.899-13.899 0-7.66-6.239-13.899-13.899-13.899-7.66 0-13.899 6.239-13.899 13.899 0 7.661 6.239 13.899 13.899 13.899Z"
//                 fill="#fff"
//               />
//               <path
//                 d="M23.635 22.295 12.7 10.36h-1.68v11.28h1.44v-9.12l10.08 10.08 1.095-1.095ZM19.36 21.64h1.44V10.36h-1.44v11.28Z"
//                 fill="#000"
//               />
//             </svg>
//             <span className="text-lg font-semibold tracking-tight select-none">
//               Create Next Pro
//             </span>
//           </div>
//           <nav className="flex items-center gap-4">
//             {isConnected ? <UserNav /> : <PublicNav />}
//             <LocaleSwitcher />
//           </nav>
//         </div>
//       </header>
//       {/* Main content */}
//       <section className="mx-auto w-full max-w-3xl py-16 px-6">
//         {isConnected ? <DashboardPage /> : <HomePage />}
//       </section>
//     </main>
//   );
// }

// // Design inspiré de nextjs.org avec Tailwind CSS.
