/**
 * Kilimanjaro invoice tool.
 * Generate and store WhatsApp-formatted invoices.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Africa/Johannesburg",
  });
}

export async function generateInvoice(
  phoneNumber: string,
  client: string,
  amount: string,
  description: string
): Promise<string> {
  const user = await prisma.user.upsert({
    where: { phoneNumber },
    update: {},
    create: { phoneNumber },
  });

  const inv = await prisma.invoice.create({
    data: { userId: user.id, client, amount, description },
  });

  const num  = `INV-${String(inv.id).padStart(4, "0")}`;
  const date = formatDate(new Date());

  return [
    `🧾 *INVOICE*`,
    `━━━━━━━━━━━━━━━━━━`,
    `*Invoice #:* ${num}`,
    `*Date:* ${date}`,
    ``,
    `*Client:* ${client}`,
    `*Service:* ${description}`,
    `*Amount:* ${amount}`,
    `━━━━━━━━━━━━━━━━━━`,
    `_Say "my invoices" to view history._`,
  ].join("\n");
}

export async function listInvoices(phoneNumber: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { phoneNumber },
    include: {
      invoices: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });

  if (!user || user.invoices.length === 0) {
    return (
      `🧾 No invoices yet.\n` +
      `Say *invoice: <client>, <amount>, <description>* to create one.`
    );
  }

  const lines = user.invoices.map((inv, i) => {
    const num  = `INV-${String(inv.id).padStart(4, "0")}`;
    const date = formatDate(inv.createdAt);
    return `${i + 1}. ${num} — ${inv.client} — ${inv.amount} — ${date}`;
  });

  return `🧾 *Recent Invoices:*\n${lines.join("\n")}`;
}
