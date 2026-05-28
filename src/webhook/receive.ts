/**
 * POST /webhook — Receive incoming WhatsApp messages.
 *
 * Phase 2: Extract sender + text → brain.processMessage → Claude reply sent back.
 */

import { Request, Response } from "express";
import { WAIncomingMessage } from "../whatsapp/types";
import { sendMessage } from "../whatsapp/client";
import { processMessage } from "../agent/brain";

/**
 * Extract the first text message from a WhatsApp webhook payload.
 * Returns null if the payload contains no text message (e.g. status update).
 */
function extractMessage(body: WAIncomingMessage): { from: string; text: string } | null {
  try {
    const messages = body.entry?.[0]?.changes?.[0]?.value?.messages;
    if (!messages || messages.length === 0) return null;

    const msg = messages[0];
    if (msg.type !== "text" || !msg.text?.body) return null;

    return { from: msg.from, text: msg.text.body };
  } catch {
    return null;
  }
}

export async function receiveWebhook(req: Request, res: Response): Promise<void> {
  // Always respond 200 immediately — Meta will retry if it doesn't get a fast ack
  res.sendStatus(200);

  const body = req.body as WAIncomingMessage;

  // Ignore non-WhatsApp payloads
  if (body.object !== "whatsapp_business_account") return;

  const message = extractMessage(body);
  if (!message) return; // status update or unsupported type — ignore

  console.log(`📩 From ${message.from}: ${message.text}`);

  try {
    const reply = await processMessage(message.from, message.text);
    await sendMessage(message.from, reply);
    console.log(`✅ Reply sent to ${message.from}: ${reply.substring(0, 60)}...`);
  } catch (err) {
    console.error(`❌ Failed to process or send reply:`, err instanceof Error ? err.message : err);
  }
}
