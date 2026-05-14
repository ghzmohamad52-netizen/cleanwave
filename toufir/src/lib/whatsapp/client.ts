// WhatsApp Business Cloud API client (Meta Graph API v20+).

const GRAPH_URL = "https://graph.facebook.com/v20.0";

type TextMessage = { type: "text"; text: { body: string; preview_url?: boolean } };
type TemplateMessage = {
  type: "template";
  template: {
    name: string;
    language: { code: string };
    components?: Array<Record<string, unknown>>;
  };
};
type InteractiveMessage = {
  type: "interactive";
  interactive: Record<string, unknown>;
};

type OutgoingPayload = TextMessage | TemplateMessage | InteractiveMessage;

async function send(to: string, payload: OutgoingPayload): Promise<void> {
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!phoneId || !token) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`[whatsapp:dev] to=${to}`, payload);
      return;
    }
    throw new Error("WhatsApp credentials not configured");
  }
  const res = await fetch(`${GRAPH_URL}/${phoneId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: to.replace(/^\+/, ""),
      ...payload,
    }),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`WhatsApp send failed (${res.status}): ${detail}`);
  }
}

export async function sendWhatsAppText(to: string, body: string) {
  await send(to, { type: "text", text: { body, preview_url: false } });
}

export async function sendWhatsAppTemplate(
  to: string,
  name: string,
  langCode: string,
  variables: string[] = []
) {
  await send(to, {
    type: "template",
    template: {
      name,
      language: { code: langCode },
      components: variables.length
        ? [
            {
              type: "body",
              parameters: variables.map((v) => ({ type: "text", text: v })),
            },
          ]
        : undefined,
    },
  });
}

export async function sendDealCard(
  to: string,
  args: { title: string; price: string; deepLink: string }
) {
  await send(to, {
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: `${args.title}\n💰 ${args.price}` },
      action: {
        buttons: [
          {
            type: "reply",
            reply: { id: `view_${args.deepLink}`, title: "👀 شوف العرض" },
          },
          {
            type: "reply",
            reply: { id: `join_${args.deepLink}`, title: "🛒 شارك" },
          },
        ],
      },
    },
  });
}
