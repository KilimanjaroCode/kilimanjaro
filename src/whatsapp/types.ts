/**
 * WhatsApp Cloud API type definitions.
 * Covers the incoming webhook payload shape Meta sends to our server.
 */

export interface WAIncomingMessage {
  object: string;
  entry: WAEntry[];
}

export interface WAEntry {
  id: string;
  changes: WAChange[];
}

export interface WAChange {
  value: WAChangeValue;
  field: string;
}

export interface WAChangeValue {
  messaging_product: string;
  metadata: WAMetadata;
  contacts?: WAContact[];
  messages?: WAMessage[];
  statuses?: WAStatus[];
}

export interface WAMetadata {
  display_phone_number: string;
  phone_number_id: string;
}

export interface WAContact {
  profile: { name: string };
  wa_id: string;
}

export interface WAMessage {
  from: string;       // sender phone number
  id: string;         // message ID
  timestamp: string;
  type: "text" | "image" | "audio" | "document" | "interactive";
  text?: { body: string };
}

export interface WAStatus {
  id: string;
  status: "sent" | "delivered" | "read" | "failed";
  timestamp: string;
  recipient_id: string;
}
