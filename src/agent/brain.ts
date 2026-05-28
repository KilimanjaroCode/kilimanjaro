/**
 * Kilimanjaro brain.
 * Routes tool intents first; falls back to Claude conversation with memory.
 */

import Anthropic from "@anthropic-ai/sdk";
import { loadHistory, saveMessage } from "../memory/store";
import { detectIntent } from "./intent";
import { saveNote, listNotes, deleteNote } from "../tools/notes";
import { createReminder, listReminders, cancelReminder } from "../tools/reminders";
import { generateInvoice, listInvoices } from "../tools/invoice";

const client = new Anthropic();

const SYSTEM_PROMPT = `You are Kilimanjaro, a personal AI assistant available on WhatsApp.
You were built by Second Intelligence.
You are helpful, concise, and friendly.
You remember everything said in this conversation.
Keep replies short — WhatsApp messages should be easy to read on a phone.

You also have tools:
- Notes: "note: <text>" to save, "notes" to list, "delete note <n>" to remove
- Reminders: "remind me at 9am: <text>" or "remind me in 30 minutes: <text>"
- Invoices: "invoice: <client>, <amount>, <description>"

Mention these tools if they're relevant to what the user is asking for.`;

/**
 * Process an incoming WhatsApp message.
 * Tool intents are dispatched directly; everything else goes to Claude.
 */
export async function processMessage(
  phoneNumber: string,
  userMessage: string
): Promise<string> {
  const intent = detectIntent(userMessage);

  // ── Tool dispatch ──────────────────────────────────────────────────────────
  if (intent.tool !== "chat") {
    const { tool, args } = intent;

    if (tool === "save-note")       return saveNote(phoneNumber, args.content);
    if (tool === "list-notes")      return listNotes(phoneNumber);
    if (tool === "delete-note")     return deleteNote(phoneNumber, parseInt(args.index));

    if (tool === "create-reminder") return createReminder(phoneNumber, args.timeStr, args.text);
    if (tool === "list-reminders")  return listReminders(phoneNumber);
    if (tool === "cancel-reminder") return cancelReminder(phoneNumber, parseInt(args.index));

    if (tool === "invoice") {
      const parts = args.raw.split(",").map((p) => p.trim());
      if (parts.length < 3) {
        return (
          `🧾 Format: *invoice: <client>, <amount>, <description>*\n` +
          `Example: invoice: Acme Corp, R5000, consulting services`
        );
      }
      return generateInvoice(phoneNumber, parts[0], parts[1], parts.slice(2).join(", "));
    }

    if (tool === "list-invoices") return listInvoices(phoneNumber);
  }

  // ── Claude conversation with history ──────────────────────────────────────
  await saveMessage(phoneNumber, "user", userMessage);
  const history = await loadHistory(phoneNumber);

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: history,
  });

  const reply =
    response.content[0].type === "text"
      ? response.content[0].text
      : "Sorry, I couldn't process that.";

  await saveMessage(phoneNumber, "assistant", reply);
  return reply;
}
