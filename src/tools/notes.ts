/**
 * Kilimanjaro notes tool.
 * Save, list, and delete plain-text notes per user.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function saveNote(phoneNumber: string, content: string): Promise<string> {
  const user = await prisma.user.upsert({
    where: { phoneNumber },
    update: {},
    create: { phoneNumber },
  });

  const note = await prisma.note.create({
    data: { userId: user.id, content },
  });

  return `📝 Note saved (#${note.id}): ${content}`;
}

export async function listNotes(phoneNumber: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { phoneNumber },
    include: { notes: { orderBy: { createdAt: "asc" } } },
  });

  if (!user || user.notes.length === 0) {
    return `📝 No notes yet.\nSay *note: <text>* to save one.`;
  }

  const lines = user.notes.map((n, i) => `${i + 1}. ${n.content}`);
  return `📝 *Your Notes:*\n${lines.join("\n")}\n\nSay *delete note <number>* to remove one.`;
}

export async function deleteNote(phoneNumber: string, index: number): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { phoneNumber },
    include: { notes: { orderBy: { createdAt: "asc" } } },
  });

  if (!user || user.notes.length === 0) {
    return `📝 No notes to delete.`;
  }

  const note = user.notes[index - 1];
  if (!note) {
    return `📝 No note #${index}. You have ${user.notes.length} note(s).`;
  }

  await prisma.note.delete({ where: { id: note.id } });
  return `🗑️ Note #${index} deleted: "${note.content}"`;
}
