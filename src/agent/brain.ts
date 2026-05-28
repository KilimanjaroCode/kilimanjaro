/**
 * Kilimanjaro brain.
 * Loads conversation history, calls Claude claude-sonnet-4-6, saves the reply.
 */

import Anthropic from "@anthropic-ai/sdk";
import { loadHistory, saveMessage } from "../memory/store";

const client = new Anthropic(); // reads ANTHROPIC_API_KEY from env

const SYSTEM_PROMPT = `You are Kilimanjaro, a personal AI assistant available on WhatsApp.
You were built by Second Intelligence.
You are helpful, concise, and friendly.
You remember everything said in this conversation.
Keep replies short — WhatsApp messages should be easy to read on a phone.`;

/**
 * Process an incoming WhatsApp message:
 * 1. Save the user message to history
 * 2. Load the full conversation history
 * 3. Call Claude with the history
 * 4. Save Claude's reply
 * 5. Return the reply text
 */
export async function processMessage(
  phoneNumber: string,
  userMessage: string
): Promise<string> {
  // 1. Persist user message first so it's included in history
  await saveMessage(phoneNumber, "user", userMessage);

  // 2. Load full history (includes the message just saved)
  const history = await loadHistory(phoneNumber);

  // 3. Call Claude
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

  // 4. Persist assistant reply
  await saveMessage(phoneNumber, "assistant", reply);

  return reply;
}
