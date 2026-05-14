# Toufir — توفير

Group-buying marketplace for Morocco. Pool orders with neighbors, unlock wholesale prices, pick up at a local agent.

> **Tagline (Darija):** نشريو بجوج، نوفّرو بجوج — *On achète ensemble, on économise ensemble.*

---

## What's in the box (MVP)

| Capability | Implementation |
|---|---|
| Customer signup | Phone OTP (+212) via WhatsApp, SMS fallback (Twilio) |
| Browse deals | Locale-aware listing, deal cards with live progress bars |
| Group-buy mechanics | `minParticipants` threshold → escrow → activation → pickup |
| Payments | CMI (Moroccan 3DS), wallet, COD |
| Escrow | Funds held in DB-tracked wallet; released on QR pickup |
| Pickup | QR code (PNG/SVG) + 6-char human-readable code, scanned by agent |
| Agent dashboard | Pending pickups, scan form, revenue |
| Supplier dashboard | Active deals, GMV, products |
| WhatsApp bot | Meta Cloud API webhook with Darija NLU (Anthropic Claude) |
| Voice notes | Whisper transcription (Arabic + Darija) |
| i18n | `ar` (RTL, default), `fr`, `en` via next-intl |
| Cron | Hourly deal-expiry job: refund or activate |

## Stack

- **Next.js 14** App Router · TypeScript strict · React 18
- **Tailwind CSS** + shadcn/ui-style primitives
- **Prisma 5** + PostgreSQL (Supabase)
- **Supabase Auth** (phone), **Upstash Redis** (rate limit + cache)
- **CMI** payment gateway (hosted 3DS form, signed)
- **WhatsApp Cloud API** (Meta Graph v20)
- **Anthropic Claude** (Haiku 4.5) for Darija intent extraction
- **OpenAI Whisper** for voice transcription
- **Resend** for transactional email
- **Cloudinary** for product images
- **Vercel** + **Cloudflare** for hosting/CDN

## Quick start

```bash
# 1. Install deps
cp .env.example .env
# Fill in DATABASE_URL + at minimum the Supabase keys.
npm install

# 2. Database
npm run db:push      # apply schema
npm run db:seed      # seed supplier, agent, 3 deals

# 3. Run
npm run dev          # http://localhost:3000
```

You can develop most of the app without external credentials. The SMS, WhatsApp, CMI, Anthropic, and Whisper clients all log to console in dev mode when their env vars are missing.

## Project layout

```
toufir/
├─ prisma/
│  ├─ schema.prisma     # 10 models incl. Deal, Order, WalletTransaction
│  └─ seed.ts
├─ messages/
│  ├─ ar.json fr.json en.json
├─ src/
│  ├─ app/
│  │  ├─ page.tsx                  # marketing landing
│  │  ├─ login/                    # phone OTP
│  │  ├─ onboarding/               # name + city
│  │  ├─ deals/                    # listing + detail
│  │  ├─ checkout/[dealId]/        # quantity + payment
│  │  ├─ orders/[id]/              # QR pickup screen
│  │  ├─ account/                  # wallet + orders
│  │  ├─ agent/                    # agent dashboard + scan
│  │  ├─ supplier/                 # supplier dashboard
│  │  └─ api/
│  │     ├─ auth/otp/{send,verify} # phone OTP
│  │     ├─ deals/                 # public deal list
│  │     ├─ orders/                # create order, CMI redirect
│  │     ├─ payments/cmi/callback/ # 3DS return
│  │     ├─ agent/pickup/          # scan + release escrow
│  │     ├─ wallet/topup/          # wallet recharge via CMI
│  │     ├─ whatsapp/webhook/      # Meta inbound
│  │     ├─ cron/expire-deals/     # hourly job
│  │     └─ health/
│  ├─ components/                  # UI primitives + DealCard, Nav
│  ├─ lib/
│  │  ├─ auth/{supabase,session,otp}.ts
│  │  ├─ payments/{cmi,wallet,escrow}.ts
│  │  ├─ whatsapp/{client,verify}.ts
│  │  ├─ sms/twilio.ts
│  │  ├─ ai/{darija,voice}.ts
│  │  ├─ i18n/{config,request,routing}.ts
│  │  ├─ redis.ts
│  │  └─ utils.ts (cn, formatMAD, pickupCode, …)
│  └─ middleware.ts                # next-intl locale routing
└─ vercel.json                     # cron schedule
```

## Group-buy state machine

```
        ┌─────────┐  threshold met       ┌────────────┐
        │  OPEN   │ ───────────────────► │  ACTIVATED │
        └────┬────┘                      └─────┬──────┘
             │ deadline & under threshold       │ all picked up
             ▼                                  ▼
        ┌─────────┐                       ┌────────────┐
        │ EXPIRED │  refund all orders    │  FULFILLED │
        └─────────┘                       └────────────┘
```

Order payment lifecycle: `PENDING → HELD_IN_ESCROW → RELEASED` (or `REFUNDED` if deal expires).

## Auth flow

1. User enters +212 phone → `POST /api/auth/otp/send`
2. Server generates 6-digit code, stores SHA-256 hash, sends via WhatsApp (falls back to SMS).
3. User submits code → `POST /api/auth/otp/verify`
4. Server verifies, creates/links Supabase Auth user, upserts Prisma `User`, sets `toufir_uid` cookie.
5. New users are routed to `/onboarding`.

Rate limits (per phone): 3 OTPs / 10 min, 60 deal-listing requests / minute.

## CMI integration notes

- Hosted 3DS gateway — we never see the PAN.
- Payload signed with SHA-512 store key (CMI HASH v3).
- Callback handler at `/api/payments/cmi/callback` (POST form-urlencoded).
- Signature is re-verified on the callback before crediting the order.
- Test env: `https://testpayment.cmi.co.ma/fim/est3Dgate`. Production: replace `CMI_API_URL`.

## WhatsApp bot

- Meta Cloud API. Set `WHATSAPP_VERIFY_TOKEN` to whatever you put in the Meta dashboard subscriber-verification step.
- Signature: `X-Hub-Signature-256` is verified using `WHATSAPP_APP_SECRET`.
- Incoming voice notes are downloaded via Graph and sent to Whisper with `language=ar` — works well for Darija.
- Conversation context (last 10 messages + intent) persisted in `WhatsAppConversation`.

## Deployment (Vercel + Supabase + Cloudflare)

1. **Supabase** project: enable Phone Auth, copy `DATABASE_URL`, anon key, service-role key.
2. **Upstash**: create a Redis database, copy REST URL + token.
3. **Vercel**: import repo, point root to `toufir/`. Add env vars from `.env.example`.
4. **Cron**: `vercel.json` already declares `/api/cron/expire-deals` hourly. Protect with `CRON_SECRET`.
5. **Cloudflare**: put the apex domain in front of Vercel for DDoS protection + extra caching.
6. **Meta**: configure the webhook URL `https://toufir.ma/api/whatsapp/webhook` and verify with your token.
7. **CMI**: register `https://toufir.ma/api/payments/cmi/callback` as `okUrl` / `failUrl`.

## Roadmap (not in MVP)

- Supplier self-service product creation flow
- Push notifications via web push + WhatsApp template messages on activation/expiry
- Map view (Google Maps) of pickup points
- Referral system + agent commission payouts to bank accounts
- Admin moderation dashboard
- A/B testing of deal copy via the AI layer
