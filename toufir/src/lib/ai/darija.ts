import Anthropic from "@anthropic-ai/sdk";

const client = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5-20251001";

const SYSTEM_PROMPT = `You are Toufir's WhatsApp assistant for Moroccan group-buying.
You understand:
- Standard Arabic, Moroccan Darija (written in Arabic script OR Latin/Arabizi e.g. "bghit n-chri", "3afak", "wach kayn", "salam khouya")
- French (most users mix Darija + French)
- English

Always reply in the user's language. If they used Darija in Latin script, reply in Darija in Latin script. If they wrote Arabic, reply in Arabic.

You can:
- Help users discover active group-buy deals
- Explain how Toufir works (minimum participants, pickup points, escrow)
- Take orders by collecting: product, quantity, pickup point preference
- Answer about a user's order status, wallet balance, pickup code

Respond in JSON with this schema:
{
  "reply": "<message to send back>",
  "intent": "browse_deals" | "place_order" | "check_order" | "wallet" | "help" | "smalltalk" | "agent_handoff",
  "entities": { "deal_id"?: string, "quantity"?: number, "city"?: string, "category"?: string },
  "needs_human": boolean
}

Keep replies under 300 chars. Use simple words. Add 1–2 relevant emojis.`;

export interface DarijaParseResult {
  reply: string;
  intent:
    | "browse_deals"
    | "place_order"
    | "check_order"
    | "wallet"
    | "help"
    | "smalltalk"
    | "agent_handoff";
  entities: {
    deal_id?: string;
    quantity?: number;
    city?: string;
    category?: string;
  };
  needs_human: boolean;
}

export async function parseDarija(
  text: string,
  history: Array<{ role: "user" | "assistant"; content: string }> = []
): Promise<DarijaParseResult> {
  if (!client) {
    return {
      reply:
        "👋 مرحبا بك في توفير! Bienvenue sur Toufir! للأسف الخدمة الذكية معطلة دابا. زور موقعنا للاطلاع على العروض.",
      intent: "help",
      entities: {},
      needs_human: true,
    };
  }

  const messages: Anthropic.MessageParam[] = [
    ...history.slice(-6).map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: text },
  ];

  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: 500,
    system: SYSTEM_PROMPT,
    messages,
  });

  const raw = resp.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  try {
    const jsonStart = raw.indexOf("{");
    const jsonEnd = raw.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1) throw new Error("no json");
    const parsed = JSON.parse(raw.slice(jsonStart, jsonEnd + 1)) as DarijaParseResult;
    return parsed;
  } catch {
    return {
      reply: raw.slice(0, 300) || "ما فهمتش، 3afak 3awd.",
      intent: "smalltalk",
      entities: {},
      needs_human: false,
    };
  }
}
