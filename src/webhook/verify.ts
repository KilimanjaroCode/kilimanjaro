/**
 * GET /webhook — Meta webhook verification handshake.
 *
 * When you register a webhook URL in the Meta dashboard, Meta sends a GET
 * request with a hub.challenge value. We must echo it back to confirm we
 * own the endpoint. The hub.verify_token must match WEBHOOK_VERIFY_TOKEN.
 */

import { Request, Response } from "express";

export function verifyWebhook(req: Request, res: Response): void {
  const mode      = req.query["hub.mode"] as string;
  const token     = req.query["hub.verify_token"] as string;
  const challenge = req.query["hub.challenge"] as string;

  const verifyToken = process.env.WEBHOOK_VERIFY_TOKEN;

  if (mode === "subscribe" && token === verifyToken) {
    console.log("✅ Webhook verified by Meta");
    res.status(200).send(challenge);
  } else {
    console.error("❌ Webhook verification failed — token mismatch");
    res.sendStatus(403);
  }
}
