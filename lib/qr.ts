import "server-only";

import crypto from "node:crypto";

function getQrTokenSecret(): string {
  const secret = process.env.QR_TOKEN_SECRET;
  if (!secret) {
    throw new Error("QR token signing is not configured.");
  }
  return secret;
}

export type TicketPayload = {
  id: string;
  qr_token: string;
};

export function signTicketToken(ticketId: string): string {
  const signature = crypto
    .createHmac("sha256", getQrTokenSecret())
    .update(ticketId)
    .digest("hex");
  return `${ticketId}.${signature}`;
}

export function verifyTicketToken(
  token: string,
): { valid: true; ticketId: string } | { valid: false } {
  const [ticketId, signature, ...extra] = token.split(".");
  if (
    extra.length > 0 ||
    !ticketId ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ticketId) ||
    !signature ||
    !/^[0-9a-f]{64}$/i.test(signature)
  ) {
    return { valid: false };
  }

  const expected = crypto
    .createHmac("sha256", getQrTokenSecret())
    .update(ticketId)
    .digest();
  const provided = Buffer.from(signature, "hex");
  if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) {
    return { valid: false };
  }

  return { valid: true, ticketId };
}

export function createTicketPayloads(quantity: number): TicketPayload[] {
  return Array.from({ length: quantity }, () => {
    const id = crypto.randomUUID();
    return { id, qr_token: signTicketToken(id) };
  });
}
