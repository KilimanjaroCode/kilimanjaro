# 🏔️ Kilimanjaro

Personal WhatsApp AI agent powered by Claude — built by Second Intelligence.

---

## What it does

Kilimanjaro is a private AI assistant you access from WhatsApp.  
It remembers your conversations, saves notes, fires reminders, and generates invoices.

---

## Features

| Command | What happens |
|---|---|
| Any message | Claude responds with conversation memory |
| `note: <text>` | Save a note |
| `notes` | List all your notes |
| `delete note <n>` | Remove note #n |
| `remind me at 9am: <text>` | Set a reminder for 9am |
| `remind me in 2 hours: <text>` | Set a reminder 2 hours from now |
| `reminders` | List active reminders |
| `cancel reminder <n>` | Cancel reminder #n |
| `invoice: <client>, <amount>, <description>` | Generate an invoice |
| `my invoices` | List recent invoices |

---

## Architecture

```
WhatsApp
  → Meta Cloud API
    → POST /webhook (Railway)
      → intent detection
        → tool handler  (notes / reminders / invoices)
           OR
        → Claude conversation  (history loaded from SQLite)
      → sendMessage → WhatsApp
```

**Background job:** node-cron checks every minute for due reminders and sends them proactively.

---

## Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js + TypeScript |
| Framework | Express |
| Database | SQLite via Prisma (volume-mounted on Railway) |
| AI | Claude claude-sonnet-4-6 (Anthropic) |
| Messaging | WhatsApp Cloud API (Meta) |
| Deployment | Railway |

---

## Project structure

```
src/
  index.ts              Server entry point + cron start
  webhook/
    verify.ts           GET /webhook — Meta handshake
    receive.ts          POST /webhook — message handler
  whatsapp/
    client.ts           sendMessage() via Graph API
    types.ts            WhatsApp payload types
  agent/
    brain.ts            Routes intents; calls Claude with history
    intent.ts           Regex intent detection
  memory/
    store.ts            loadHistory() + saveMessage() per phone
  tools/
    notes.ts            Save / list / delete notes
    reminders.ts        Create / list / cancel reminders + cron
    invoice.ts          Generate + store invoices
prisma/
  schema.prisma         User, Message, Note, Reminder, Invoice
```

---

## Local development

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env
# Fill in: WHATSAPP_TOKEN, WHATSAPP_PHONE_ID, WEBHOOK_VERIFY_TOKEN, ANTHROPIC_API_KEY

# 3. Create database
npx prisma db push

# 4. Run
npm run dev
```

---

## Environment variables

| Variable | Description |
|---|---|
| `WHATSAPP_TOKEN` | Meta permanent system user access token |
| `WHATSAPP_PHONE_ID` | Meta phone number ID (from API Setup page) |
| `WEBHOOK_VERIFY_TOKEN` | Secret for Meta webhook verification |
| `ANTHROPIC_API_KEY` | Anthropic API key |
| `DATABASE_URL` | SQLite path — `file:/data/kilimanjaro.db` on Railway |
| `PORT` | Auto-set by Railway; defaults to 3000 locally |

---

## Deployment (Railway)

Push to `KilimanjaroCode/kilimanjaro` — Railway auto-deploys.

| Step | Command |
|---|---|
| Build | `prisma generate && tsc` |
| Start | `npx prisma db push && node dist/index.js` |

**Volume:** Mount a Railway volume at `/data` and set `DATABASE_URL=file:/data/kilimanjaro.db`.  
This ensures notes, reminders, conversation history, and invoices survive redeploys.

---

## Phases

| Phase | What was built |
|---|---|
| 1 | Echo bot — webhook + Meta integration live |
| 2 | Claude brain — conversation memory via SQLite |
| 3 | Tools — notes, reminders (cron), invoices |
| 4 | Production — permanent token, persistent volume, README |

---

*Built by Second Intelligence — private repository.*
