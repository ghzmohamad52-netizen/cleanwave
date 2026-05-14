"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMAD } from "@/lib/utils";
import { useRouter } from "@/lib/i18n/routing";

type Method = "CMI_CARD" | "WALLET" | "COD";

export function CheckoutForm({
  dealId,
  unitPrice,
  walletBalance,
  labels,
}: {
  dealId: string;
  unitPrice: number;
  walletBalance: number;
  labels: {
    quantity: string;
    total: string;
    paymentMethod: string;
    methodCard: string;
    methodWallet: string;
    methodCod: string;
    walletBalance: string;
    confirm: string;
    terms: string;
  };
}) {
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [method, setMethod] = useState<Method>("CMI_CARD");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = unitPrice * quantity;
  const canWallet = walletBalance >= total;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dealId, quantity, paymentMethod: method }),
    });
    if (!res.ok) {
      setPending(false);
      const body = await res.json().catch(() => ({ error: "" }));
      setError(body.error ?? "Erreur");
      return;
    }
    const data = (await res.json()) as
      | { orderId: string; redirect: { action: string; fields: Record<string, string> } }
      | { orderId: string };
    if ("redirect" in data) {
      // Submit a form to CMI hosted page.
      const form = document.createElement("form");
      form.method = "POST";
      form.action = data.redirect.action;
      for (const [k, v] of Object.entries(data.redirect.fields)) {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = k;
        input.value = v;
        form.appendChild(input);
      }
      document.body.appendChild(form);
      form.submit();
      return;
    }
    router.push(`/orders/${data.orderId}`);
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="qty">{labels.quantity}</Label>
        <Input
          id="qty"
          type="number"
          min={1}
          max={10}
          value={quantity}
          onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value || "1", 10)))}
        />
      </div>

      <div className="space-y-2">
        <Label>{labels.paymentMethod}</Label>
        {(["CMI_CARD", "WALLET", "COD"] as const).map((m) => {
          const disabled = m === "WALLET" && !canWallet;
          return (
            <label
              key={m}
              className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 ${
                method === m ? "border-primary bg-primary/5" : ""
              } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
            >
              <input
                type="radio"
                name="method"
                value={m}
                checked={method === m}
                onChange={() => !disabled && setMethod(m)}
                disabled={disabled}
              />
              <div className="flex-1">
                <div className="font-medium">
                  {m === "CMI_CARD"
                    ? labels.methodCard
                    : m === "WALLET"
                    ? labels.methodWallet
                    : labels.methodCod}
                </div>
                {m === "WALLET" && (
                  <div className="text-xs text-muted-foreground">{labels.walletBalance}</div>
                )}
              </div>
            </label>
          );
        })}
      </div>

      <div className="flex items-center justify-between rounded-lg bg-muted p-4">
        <span className="font-medium">{labels.total}</span>
        <span className="text-2xl font-bold text-primary">{formatMAD(total)}</span>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {labels.confirm}
      </Button>
      <p className="text-center text-xs text-muted-foreground">{labels.terms}</p>
    </form>
  );
}
