"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "@/lib/i18n/routing";

type Labels = {
  phone: string;
  phonePlaceholder: string;
  sendOtp: string;
  code: string;
  codePlaceholder: string;
  verify: string;
  resend: string;
  invalidPhone: string;
  invalidCode: string;
  rateLimited: string;
};

export function LoginForm({ labels }: { labels: Labels }) {
  const router = useRouter();
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const res = await fetch("/api/auth/otp/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    setPending(false);
    if (res.status === 429) return setError(labels.rateLimited);
    if (!res.ok) return setError(labels.invalidPhone);
    setStep("code");
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const res = await fetch("/api/auth/otp/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, code }),
    });
    setPending(false);
    if (!res.ok) return setError(labels.invalidCode);
    const data = (await res.json()) as { isNew: boolean };
    router.push(data.isNew ? "/onboarding" : "/deals");
    router.refresh();
  }

  return (
    <form onSubmit={step === "phone" ? sendOtp : verify} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="phone">{labels.phone}</Label>
        <Input
          id="phone"
          type="tel"
          dir="ltr"
          inputMode="tel"
          autoComplete="tel"
          placeholder={labels.phonePlaceholder}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          disabled={step !== "phone"}
          required
        />
      </div>
      {step === "code" && (
        <div className="space-y-1.5">
          <Label htmlFor="code">{labels.code}</Label>
          <Input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            dir="ltr"
            placeholder={labels.codePlaceholder}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            required
          />
        </div>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full" size="lg" disabled={pending}>
        {step === "phone" ? labels.sendOtp : labels.verify}
      </Button>
      {step === "code" && (
        <Button
          type="button"
          variant="ghost"
          className="w-full"
          onClick={() => setStep("phone")}
        >
          {labels.resend}
        </Button>
      )}
    </form>
  );
}
