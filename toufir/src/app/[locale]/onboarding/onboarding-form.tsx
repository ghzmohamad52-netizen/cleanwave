"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "@/lib/i18n/routing";

const MOROCCAN_CITIES = [
  "Casablanca",
  "Rabat",
  "Marrakech",
  "Fès",
  "Tanger",
  "Agadir",
  "Meknès",
  "Oujda",
  "Kénitra",
  "Tétouan",
  "Salé",
  "Mohammedia",
];

export function OnboardingForm({
  defaults,
  labels,
}: {
  defaults: { fullName: string; city: string };
  labels: { name: string; city: string; save: string };
}) {
  const router = useRouter();
  const [fullName, setFullName] = useState(defaults.fullName);
  const [city, setCity] = useState(defaults.city || MOROCCAN_CITIES[0]!);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    await fetch("/api/auth/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName, city }),
    });
    setPending(false);
    router.push("/deals");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">{labels.name}</Label>
        <Input
          id="name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="city">{labels.city}</Label>
        <select
          id="city"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-base"
        >
          {MOROCCAN_CITIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" className="w-full" size="lg" disabled={pending}>
        {labels.save}
      </Button>
    </form>
  );
}
