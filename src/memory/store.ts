/**
 * Kilimanjaro memory store.
 * Persists conversation history per phone number using Prisma + SQLite.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * Load the last N messages for a given phone number, oldest-first.
 * Returns an empty array if the user has no history.
 */
export async function loadHistory(
  phoneNumber: string,
  limit = 20
): Promise<ChatMessage[]> {
  const user = await prisma.user.findUnique({
    where: { phoneNumber },
    include: {
      messages: {
        orderBy: { createdAt: "desc" },
        take: limit,
      },
    },
  });

  if (!user) return [];

  // Reverse so messages are oldest-first (required by Claude messages API)
  return user.messages
    .reverse()
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
}

/**
 * Save a single message (user or assistant) for a phone number.
 * Creates the User record if it doesn't exist.
 */
export async function saveMessage(
  phoneNumber: string,
  role: "user" | "assistant",
  content: string
): Promise<void> {
  const user = await prisma.user.upsert({
    where: { phoneNumber },
    update: {},
    create: { phoneNumber },
  });

  await prisma.message.create({
    data: { userId: user.id, role, content },
  });
}
