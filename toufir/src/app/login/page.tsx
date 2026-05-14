import { getTranslations } from "next-intl/server";
import { LoginForm } from "./login-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function LoginPage() {
  const t = await getTranslations("auth");
  const tApp = await getTranslations("app");
  return (
    <main className="container flex min-h-screen items-center justify-center py-10">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl text-primary">{tApp("name")}</CardTitle>
          <p className="text-sm text-muted-foreground">{tApp("tagline")}</p>
        </CardHeader>
        <CardContent>
          <LoginForm labels={{
            phone: t("phone_label"),
            phonePlaceholder: t("phone_placeholder"),
            sendOtp: t("send_otp"),
            code: t("code_label"),
            codePlaceholder: t("code_placeholder"),
            verify: t("verify"),
            resend: t("resend"),
            invalidPhone: t("errors.invalid_phone"),
            invalidCode: t("errors.invalid_code"),
            rateLimited: t("errors.rate_limited"),
          }} />
        </CardContent>
      </Card>
    </main>
  );
}
