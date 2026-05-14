"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "@/lib/i18n/routing";

export function ScanForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setPending(true);
    const res = await fetch("/api/agent/pickup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pickupCode: code.trim().toUpperCase() }),
    });
    setPending(false);
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setMessage({ kind: "ok", text: `✓ Picked up by ${data.customer}` });
      setCode("");
      router.refresh();
    } else {
      setMessage({ kind: "err", text: data.error ?? "Failed" });
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="code">Pickup code</Label>
        <Input
          id="code"
          dir="ltr"
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="ABCD23"
          className="font-mono text-lg tracking-widest"
        />
      </div>
      {message && (
        <p
          className={`text-sm ${
            message.kind === "ok" ? "text-emerald-600" : "text-destructive"
          }`}
        >
          {message.text}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={pending || code.length < 4}>
        Confirm pickup
      </Button>
    </form>
  );
}
