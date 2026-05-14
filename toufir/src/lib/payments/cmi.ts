import { createHash } from "node:crypto";

// CMI (Centre Monétique Interbancaire) — Morocco's 3D Secure gateway.
// CMI uses a hosted form (POST). We generate the signed payload + return a redirect URL.

export interface CmiInitArgs {
  orderId: string;
  amount: number; // MAD
  email: string;
  phone: string;
  customerName: string;
  lang?: "ar" | "fr" | "en";
}

export interface CmiRedirectForm {
  action: string;
  fields: Record<string, string>;
}

function buildHash(fields: Record<string, string>, storeKey: string): string {
  // CMI HASH (v2 / SHA-512): sort keys alphabetically (case-insensitive),
  // concat values escaped (| escaped as \| and \ as \\), then append storeKey,
  // sha512 -> base64.
  const reserved = new Set(["hash", "encoding"]);
  const keys = Object.keys(fields)
    .filter((k) => !reserved.has(k.toLowerCase()))
    .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  const concat =
    keys
      .map((k) => (fields[k] ?? "").replace(/\\/g, "\\\\").replace(/\|/g, "\\|"))
      .join("|") +
    "|" +
    storeKey.replace(/\\/g, "\\\\").replace(/\|/g, "\\|");
  return createHash("sha512").update(concat, "utf8").digest("base64");
}

export function buildCmiForm(args: CmiInitArgs): CmiRedirectForm {
  const merchantId = process.env.CMI_MERCHANT_ID;
  const storeKey = process.env.CMI_STORE_KEY;
  const action = process.env.CMI_API_URL ?? "https://testpayment.cmi.co.ma/fim/est3Dgate";
  if (!merchantId || !storeKey) {
    throw new Error("CMI credentials not configured");
  }
  const returnUrl = process.env.CMI_RETURN_URL ?? `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/cmi/callback`;

  const fields: Record<string, string> = {
    clientid: merchantId,
    storetype: "3D_PAY_HOSTING",
    hashAlgorithm: "ver3",
    TranType: "PreAuth",
    amount: args.amount.toFixed(2),
    currency: "504", // MAD
    oid: args.orderId,
    okUrl: returnUrl,
    failUrl: returnUrl,
    lang: args.lang ?? "fr",
    rnd: Date.now().toString(),
    email: args.email,
    tel: args.phone,
    BillToName: args.customerName,
    encoding: "UTF-8",
    refreshtime: "5",
    shopurl: process.env.NEXT_PUBLIC_APP_URL ?? "https://toufir.ma",
  };

  fields.HASH = buildHash(fields, storeKey);
  return { action, fields };
}

export interface CmiCallback {
  orderId: string;
  status: "approved" | "declined" | "failed";
  authCode?: string;
  procReturnCode?: string;
  raw: Record<string, string>;
}

export function parseCmiCallback(form: Record<string, string>): CmiCallback {
  const status =
    form.ProcReturnCode === "00" && form.Response === "Approved"
      ? "approved"
      : form.Response === "Declined"
      ? "declined"
      : "failed";
  return {
    orderId: form.oid ?? "",
    status,
    authCode: form.AuthCode,
    procReturnCode: form.ProcReturnCode,
    raw: form,
  };
}

export function verifyCmiCallback(form: Record<string, string>): boolean {
  const storeKey = process.env.CMI_STORE_KEY;
  if (!storeKey) return false;
  const provided = form.HASH;
  if (!provided) return false;
  const expected = buildHash(form, storeKey);
  return expected === provided;
}
