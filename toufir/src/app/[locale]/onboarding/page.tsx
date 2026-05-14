import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth/session";
import { OnboardingForm } from "./onboarding-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function OnboardingPage() {
  const user = await requireUser();
  const t = await getTranslations("auth");
  return (
    <main className="container flex min-h-screen items-center justify-center py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t("create_account")}</CardTitle>
        </CardHeader>
        <CardContent>
          <OnboardingForm
            defaults={{ fullName: user.fullName, city: user.city }}
            labels={{
              name: t("name_label"),
              city: t("city_label"),
              save: t("create_account"),
            }}
          />
        </CardContent>
      </Card>
    </main>
  );
}
