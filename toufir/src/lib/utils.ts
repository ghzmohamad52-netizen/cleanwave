import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMAD(amount: number | string): string {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("fr-MA", {
    style: "currency",
    currency: "MAD",
    maximumFractionDigits: 2,
  }).format(n);
}

export function formatPhoneMA(phone: string): string {
  // Normalize to +212XXXXXXXXX
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("212")) return `+${digits}`;
  if (digits.startsWith("0")) return `+212${digits.slice(1)}`;
  if (digits.length === 9) return `+212${digits}`;
  return `+${digits}`;
}

export function isValidMoroccanPhone(phone: string): boolean {
  // +212 followed by 6 or 7 (mobile) and 8 digits
  return /^\+212[567]\d{8}$/.test(formatPhoneMA(phone));
}

export function generatePickupCode(): string {
  // 6-char alphanumeric (no ambiguous chars)
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function dealProgress(current: number, min: number): number {
  if (min <= 0) return 100;
  return Math.min(100, Math.round((current / min) * 100));
}

export function timeRemaining(closesAt: Date | string): {
  hours: number;
  minutes: number;
  expired: boolean;
} {
  const end = typeof closesAt === "string" ? new Date(closesAt) : closesAt;
  const ms = end.getTime() - Date.now();
  if (ms <= 0) return { hours: 0, minutes: 0, expired: true };
  return {
    hours: Math.floor(ms / 3_600_000),
    minutes: Math.floor((ms % 3_600_000) / 60_000),
    expired: false,
  };
}
