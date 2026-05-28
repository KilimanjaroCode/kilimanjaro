/**
 * Intent detection for Kilimanjaro tools.
 * Matches user messages against tool trigger patterns.
 * Returns { tool: "chat" } if nothing matches — falls through to Claude.
 */

export type ToolName =
  | "save-note"
  | "list-notes"
  | "delete-note"
  | "create-reminder"
  | "list-reminders"
  | "cancel-reminder"
  | "invoice"
  | "list-invoices"
  | "chat";

export interface Intent {
  tool: ToolName;
  args: Record<string, string>;
}

export function detectIntent(text: string): Intent {
  const t = text.trim();

  // ── Notes ──────────────────────────────────────────────────────────────────
  // "note: buy milk" | "save note: buy milk"
  const saveNoteMatch = t.match(/^(?:save\s+)?note[:\s]\s*(.+)/i);
  if (saveNoteMatch) {
    return { tool: "save-note", args: { content: saveNoteMatch[1].trim() } };
  }

  // "notes" | "my notes" | "show notes" | "list notes"
  if (/^(?:(?:show|list|my)\s+)?notes?$/i.test(t)) {
    return { tool: "list-notes", args: {} };
  }

  // "delete note 2"
  const deleteNoteMatch = t.match(/^delete\s+note\s+(\d+)$/i);
  if (deleteNoteMatch) {
    return { tool: "delete-note", args: { index: deleteNoteMatch[1] } };
  }

  // ── Reminders ──────────────────────────────────────────────────────────────
  // "remind me at 9am: standup" | "remind me at 07:00: pack bag" | "remind me in 30 minutes: call doctor"
  // NOTE: time is captured explicitly so "at 07:00" doesn't stop at the colon inside the time.
  const remindMatch = t.match(
    /^remind\s+me\s+((?:at\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?)|(?:in\s+\d+\s+\w+)):\s*(.+)/i
  );
  if (remindMatch) {
    return {
      tool: "create-reminder",
      args: { timeStr: remindMatch[1].trim(), text: remindMatch[2].trim() },
    };
  }

  // "reminders" | "my reminders" | "show reminders"
  if (/^(?:(?:show|list|my)\s+)?reminders?$/i.test(t)) {
    return { tool: "list-reminders", args: {} };
  }

  // "cancel reminder 1"
  const cancelRemMatch = t.match(/^cancel\s+reminder\s+(\d+)$/i);
  if (cancelRemMatch) {
    return { tool: "cancel-reminder", args: { index: cancelRemMatch[1] } };
  }

  // ── Invoices ───────────────────────────────────────────────────────────────
  // "invoice: Acme Corp, R5000, consulting services"
  const invoiceMatch = t.match(/^invoice[:\s]\s*(.+)/i);
  if (invoiceMatch) {
    return { tool: "invoice", args: { raw: invoiceMatch[1].trim() } };
  }

  // "invoices" | "my invoices" | "invoice history"
  if (/^(?:my\s+)?invoices?$|^invoice\s+history$/i.test(t)) {
    return { tool: "list-invoices", args: {} };
  }

  // ── Default: Claude conversation ───────────────────────────────────────────
  return { tool: "chat", args: {} };
}
