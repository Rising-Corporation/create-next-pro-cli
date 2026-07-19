// src/ui/userInfo/page-ui.tsx
import Image from "next/image";
import { getTranslations } from "next-intl/server";

type UserInfoPageUIProps = {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
};

export default async function UserInfoPageUI({ user }: UserInfoPageUIProps) {
  const t = await getTranslations("userInfo");

  return (
    <section className="py-8 px-4 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <p className="mt-2">{t("description")}</p>

      <div className="mt-8 rounded border bg-white p-6 shadow-sm dark:bg-black">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          {user?.image ? (
            <Image
              src={user.image}
              alt={t("profile_image_alt")}
              width={96}
              height={96}
              className="h-24 w-24 rounded-full object-cover"
            />
          ) : (
            <div
              className="flex h-24 w-24 items-center justify-center rounded-full bg-muted text-2xl font-semibold text-muted-foreground"
              aria-label={t("profile_image_unavailable")}
            >
              {user?.name?.charAt(0).toUpperCase() || "?"}
            </div>
          )}

          <dl className="grid flex-1 gap-4">
            <div>
              <dt className="text-sm font-medium text-gray-600 dark:text-gray-300">
                {t("name")}
              </dt>
              <dd className="mt-1 break-words">
                {user?.name || t("unavailable")}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-600 dark:text-gray-300">
                {t("email")}
              </dt>
              <dd className="mt-1 break-all">
                {user?.email || t("unavailable")}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
}
