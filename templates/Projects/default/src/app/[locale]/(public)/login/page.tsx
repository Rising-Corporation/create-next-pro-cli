// src/app/[locale]/(public)/login/page.tsx
import LoginPageUI from "@/ui/login/page-ui";
import GlobalMain from "@/ui/_global/GlobalMain";

export const dynamic = "force-static";

export default function LoginPage() {
  return (
    <GlobalMain>
      <LoginPageUI />
    </GlobalMain>
  );
}
