/**
 * WhatsApp Cloud API client.
 * Handles sending messages back to users via Meta's Graph API.
 */

import axios from "axios";

const GRAPH_API_URL = "https://graph.facebook.com/v19.0";

/**
 * Send a plain text message to a WhatsApp user.
 * @param to - Recipient phone number (e.g. "27787238145")
 * @param text - Message body
 */
export async function sendMessage(to: string, text: string): Promise<void> {
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  const token   = process.env.WHATSAPP_TOKEN;

  if (!phoneId || !token) {
    throw new Error("WHATSAPP_PHONE_ID and WHATSAPP_TOKEN must be set in environment");
  }

  await axios.post(
    `${GRAPH_API_URL}/${phoneId}/messages`,
    {
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text },
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );
}
