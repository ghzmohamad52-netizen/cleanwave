// Minimal Twilio REST helper — avoids the SDK to keep the bundle small.

export async function sendSms(to: string, body: string): Promise<void> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;

  if (!sid || !token || !from) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`[sms:dev] to=${to} body=${body}`);
      return;
    }
    throw new Error("Twilio credentials not configured");
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const auth = Buffer.from(`${sid}:${token}`).toString("base64");

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: to, From: from, Body: body }).toString(),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Twilio send failed (${res.status}): ${detail}`);
  }
}

export async function sendOtpSms(phone: string, code: string, lang: "ar" | "fr" | "en" = "ar") {
  const messages: Record<string, string> = {
    ar: `رمز التحقق توفير: ${code}\nصالح لمدة 5 دقائق.`,
    fr: `Code Toufir: ${code}\nValide pendant 5 minutes.`,
    en: `Toufir code: ${code}\nValid for 5 minutes.`,
  };
  await sendSms(phone, messages[lang] ?? messages.ar!);
}
