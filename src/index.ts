/**
 * Kilimanjaro — WhatsApp AI Agent
 * Built by second-intelligence
 *
 * Express server: registers webhook routes and starts listening.
 */

import express from "express";
import { verifyWebhook } from "./webhook/verify";
import { receiveWebhook } from "./webhook/receive";

const app  = express();
const PORT = parseInt(process.env.PORT ?? "3000", 10);

// Parse JSON bodies from Meta
app.use(express.json());

// Health check — Railway and Meta both need this
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "kilimanjaro", timestamp: new Date().toISOString() });
});

// WhatsApp webhook — GET for Meta verification, POST for incoming messages
app.get("/webhook",  verifyWebhook);
app.post("/webhook", receiveWebhook);

app.listen(PORT, () => {
  console.log(`🏔️  Kilimanjaro running on port ${PORT}`);
  console.log(`   Webhook: POST /webhook`);
  console.log(`   Health:  GET  /health`);
});
