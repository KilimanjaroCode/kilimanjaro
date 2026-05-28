/**
 * Kilimanjaro reminders tool.
 * Create, list, and cancel time-based reminders.
 * A node-cron job polls every minute and fires any due reminders.
 */

import { PrismaClient } from "@prisma/client";
import cron from "node-cron";
import { sendMessage } from "../whatsapp/client";

const prisma = new PrismaClient();

// ── Time parsing ──────────────────────────────────────────────────────────────

/**
 * Parse a natural-language time string into an absolute Date.
 * Supported formats:
 *   "in 30 minutes" | "in 2 hours"
 *   "at 9am" | "at 9:30am" | "at 14:00" | "at 2pm"
 */
function parseFireAt(timeStr: string): Date | null {
  const now = new Date();
  const t   = timeStr.trim().toLowerCase();

  // "in X minutes/hours"
  const inMatch = t.match(/^in\s+(\d+)\s+(minute|minutes|min|mins|hour|hours|hr|hrs)$/);
  if (inMatch) {
    const amount = parseInt(inMatch[1]);
    const ms     = inMatch[2].startsWith("h") ? amount * 3_600_000 : amount * 60_000;
    return new Date(now.getTime() + ms);
  }

  // "at 9am" | "at 9:30pm" | "at 14:00"
  const atMatch = t.match(/^at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
  if (atMatch) {
    let hours   = parseInt(atMatch[1]);
    const mins  = atMatch[2] ? parseInt(atMatch[2]) : 0;
    const ampm  = atMatch[3];

    if (ampm === "pm" && hours < 12) hours += 12;
    if (ampm === "am" && hours === 12) hours = 0;

    const fireAt = new Date(now);
    fireAt.setHours(hours, mins, 0, 0);

    // If the time has already passed today, fire tomorrow
    if (fireAt <= now) fireAt.setDate(fireAt.getDate() + 1);

    return fireAt;
  }

  return null;
}

function formatDateTime(date: Date): string {
  return date.toLocaleString("en-ZA", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Johannesburg",
  });
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

export async function createReminder(
  phoneNumber: string,
  timeStr: string,
  text: string
): Promise<string> {
  const fireAt = parseFireAt(timeStr);
  if (!fireAt) {
    return (
      `⏰ Couldn't understand the time "${timeStr}".\n` +
      `Try: *at 9am*, *at 14:30*, *in 30 minutes*, *in 2 hours*.`
    );
  }

  const user = await prisma.user.upsert({
    where: { phoneNumber },
    update: {},
    create: { phoneNumber },
  });

  await prisma.reminder.create({
    data: { userId: user.id, text, fireAt },
  });

  return `⏰ Reminder set for ${formatDateTime(fireAt)}:\n"${text}"`;
}

export async function listReminders(phoneNumber: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { phoneNumber },
    include: {
      reminders: { where: { active: true }, orderBy: { fireAt: "asc" } },
    },
  });

  if (!user || user.reminders.length === 0) {
    return `⏰ No active reminders.\nSay *remind me at 9am: standup* to set one.`;
  }

  const lines = user.reminders.map(
    (r, i) => `${i + 1}. ${r.text} — ${formatDateTime(r.fireAt)}`
  );
  return (
    `⏰ *Active Reminders:*\n${lines.join("\n")}\n\n` +
    `Say *cancel reminder <number>* to remove one.`
  );
}

export async function cancelReminder(
  phoneNumber: string,
  index: number
): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { phoneNumber },
    include: {
      reminders: { where: { active: true }, orderBy: { fireAt: "asc" } },
    },
  });

  if (!user || user.reminders.length === 0) {
    return `⏰ No active reminders to cancel.`;
  }

  const reminder = user.reminders[index - 1];
  if (!reminder) {
    return `⏰ No reminder #${index}. You have ${user.reminders.length} active reminder(s).`;
  }

  await prisma.reminder.update({
    where: { id: reminder.id },
    data: { active: false },
  });

  return `🗑️ Reminder #${index} cancelled: "${reminder.text}"`;
}

// ── Background cron ───────────────────────────────────────────────────────────

/**
 * Start the background job that checks for due reminders every minute.
 * Call once at server startup.
 */
export function startReminderCron(): void {
  cron.schedule("* * * * *", async () => {
    const now = new Date();

    const due = await prisma.reminder.findMany({
      where: { active: true, fireAt: { lte: now } },
      include: { user: true },
    });

    for (const reminder of due) {
      try {
        await sendMessage(reminder.user.phoneNumber, `⏰ *Reminder:* ${reminder.text}`);
        await prisma.reminder.update({
          where: { id: reminder.id },
          data: { active: false, firedAt: now },
        });
        console.log(`⏰ Fired reminder for ${reminder.user.phoneNumber}: ${reminder.text}`);
      } catch (err) {
        console.error(
          `❌ Failed to fire reminder ${reminder.id}:`,
          err instanceof Error ? err.message : err
        );
      }
    }
  });

  console.log(`⏰ Reminder cron started (checking every minute)`);
}
