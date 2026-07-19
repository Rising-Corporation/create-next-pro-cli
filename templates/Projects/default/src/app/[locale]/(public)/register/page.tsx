// src/app/[locale]/(public)/register/page.tsx
import RegisterPageUI from "@/ui/register/page-ui";
import GlobalMain from "@/ui/_global/GlobalMain";

export const dynamic = "force-static";

export default function RegisterPage() {
  return (
    <GlobalMain>
      <RegisterPageUI />
    </GlobalMain>
  );
}
