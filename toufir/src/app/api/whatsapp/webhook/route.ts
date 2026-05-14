import { NextResponse } from "next/server";
import { verifyWhatsAppSignature } from "@/lib/whatsapp/verify";
import { sendWhatsAppText } from "@/lib/whatsapp/client";
import { parseDarija } from "@/lib/ai/darija";
import { transcribeVoice } from "@/lib/ai/voice";
import { prisma } from "@/lib/db/prisma";
import { checkLimit, whatsappLimiter } from "@/lib/redis";
import { formatPhoneMA } from "@/lib/utils";

// GET — Meta webhook verification.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new Response(challenge ?? "", { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

// POST — incoming messages.
export async function POST(req: Request) {
  const raw = await req.text();
  const signature = req.headers.get("x-hub-signature-256");
  if (!verifyWhatsAppSignature(raw, signature)) {
    return new Response("Bad signature", { status: 403 });
  }

  let payload: any;
  try {
    payload = JSON.parse(raw);
  } catch {
    return new Response("Bad JSON", { status: 400 });
  }

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value ?? {};
      for (const msg of value.messages ?? []) {
        await handleMessage(msg, value);
      }
    }
  }
  return NextResponse.json({ ok: true });
}

async function handleMessage(msg: any, _value: any) {
  const fromRaw = msg.from as string;
  const from = formatPhoneMA(fromRaw);

  const { success } = await checkLimit(whatsappLimiter, `wa:${from}`);
  if (!success) return;

  let text = "";
  if (msg.type === "text") {
    text = msg.text?.body ?? "";
  } else if (msg.type === "audio" || msg.type === "voice") {
    try {
      const mediaId = msg.audio?.id ?? msg.voice?.id;
      if (mediaId) {
        const audio = await downloadMedia(mediaId);
        text = await transcribeVoice(audio.buffer, audio.mimeType, "ar");
      }
    } catch (e) {
      console.error("voice transcription failed", e);
    }
  }

  if (!text) {
    await sendWhatsAppText(from, "🎙️ Ma fhmtsh. 3afak ktbha bin?");
    return;
  }

  const convo = await prisma.whatsAppConversation.upsert({
    where: { phone: from },
    create: { phone: from, messages: [] },
    update: {},
  });

  const history = (convo.messages as Array<{ role: "user" | "assistant"; content: string }>) ?? [];
  const result = await parseDarija(text, history);

  const newHistory = [
    ...history.slice(-10),
    { role: "user" as const, content: text },
    { role: "assistant" as const, content: result.reply },
  ];
  await prisma.whatsAppConversation.update({
    where: { phone: from },
    data: { messages: newHistory, context: { lastIntent: result.intent } },
  });

  await sendWhatsAppText(from, result.reply);
}

async function downloadMedia(mediaId: string): Promise<{ buffer: Buffer; mimeType: string }> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN!;
  const meta = await fetch(`https://graph.facebook.com/v20.0/${mediaId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const { url, mime_type } = (await meta.json()) as { url: string; mime_type: string };
  const file = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const buffer = Buffer.from(await file.arrayBuffer());
  return { buffer, mimeType: mime_type };
}
