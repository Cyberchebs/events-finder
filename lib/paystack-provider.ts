import "server-only";

import crypto from "node:crypto";
import { COMMISSION_RATE } from "@/lib/constants";
import type {
  Bank,
  PaymentProvider,
  PaymentWebhookEvent,
  ProviderResult,
} from "@/lib/payment-provider";

type RecordValue = Record<string, unknown>;

function isRecord(value: unknown): value is RecordValue {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isBank(value: unknown): value is Bank {
  return (
    isRecord(value) &&
    typeof value.name === "string" &&
    typeof value.code === "string"
  );
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export class PaystackProvider implements PaymentProvider {
  private get secretKey(): string | null {
    return process.env.PAYSTACK_SECRET_KEY || null;
  }

  private get headers(): HeadersInit | null {
    if (!this.secretKey) {
      return null;
    }

    return {
      Authorization: `Bearer ${this.secretKey}`,
      "Content-Type": "application/json",
    };
  }

  async listBanks(): Promise<ProviderResult<Bank[]>> {
    const headers = this.headers;
    if (!headers) {
      return { success: false, error: "Payout setup is temporarily unavailable." };
    }

    try {
      const response = await fetch(
        "https://api.paystack.co/bank?country=nigeria&perPage=300",
        { headers, cache: "no-store" },
      );
      const payload: unknown = await readJson(response);

      if (
        !response.ok ||
        !isRecord(payload) ||
        payload.status !== true ||
        !Array.isArray(payload.data)
      ) {
        console.error(`[PaystackProvider.listBanks] status=${response.status}`);
        return { success: false, error: "Could not load the bank list. Try again." };
      }

      const seenCodes = new Set<string>();
      const banks: Bank[] = [];
      for (const item of payload.data) {
        if (isBank(item) && !seenCodes.has(item.code)) {
          seenCodes.add(item.code);
          banks.push({
            id: typeof (item as Record<string, unknown>).id === "number"
              ? ((item as Record<string, unknown>).id as number)
              : undefined,
            name: item.name,
            code: item.code,
          });
        }
      }

      return { success: true, data: banks };
    } catch (error) {
      console.error("[PaystackProvider.listBanks] request failed", error);
      return { success: false, error: "Could not load the bank list. Try again." };
    }
  }

  async resolveAccount(params: {
    accountNumber: string;
    bankCode: string;
  }): Promise<ProviderResult<{ accountName: string }>> {
    const headers = this.headers;
    if (!headers) {
      return { success: false, error: "Payout setup is temporarily unavailable." };
    }

    try {
      const query = new URLSearchParams({
        account_number: params.accountNumber,
        bank_code: params.bankCode,
      });
      const response = await fetch(
        `https://api.paystack.co/bank/resolve?${query.toString()}`,
        { headers, cache: "no-store" },
      );
      const payload: unknown = await readJson(response);

      if (
        !response.ok ||
        !isRecord(payload) ||
        payload.status !== true ||
        !isRecord(payload.data) ||
        typeof payload.data.account_name !== "string"
      ) {
        const message =
          isRecord(payload) && typeof payload.message === "string"
            ? payload.message
            : "We couldn't verify that bank account.";
        console.error(`[PaystackProvider.resolveAccount] status=${response.status}`, message);
        return { success: false, error: message };
      }

      return { success: true, data: { accountName: payload.data.account_name } };
    } catch (error) {
      console.error("[PaystackProvider.resolveAccount] request failed", error);
      return { success: false, error: "We couldn't verify that bank account." };
    }
  }

  async createSplitRecipient(params: {
    businessName: string;
    bankCode: string;
    accountNumber: string;
  }): Promise<ProviderResult<{ subaccountCode: string; accountName?: string }>> {
    const headers = this.headers;
    if (!headers) {
      return { success: false, error: "Payout setup is temporarily unavailable." };
    }

    try {
      const response = await fetch("https://api.paystack.co/subaccount", {
        method: "POST",
        headers,
        body: JSON.stringify({
          business_name: params.businessName,
          settlement_bank: params.bankCode,
          bank_code: params.bankCode,
          account_number: params.accountNumber,
          percentage_charge: COMMISSION_RATE * 100,
        }),
        cache: "no-store",
      });
      const payload: unknown = await readJson(response);

      if (
        !response.ok ||
        !isRecord(payload) ||
        payload.status !== true ||
        !isRecord(payload.data) ||
        typeof payload.data.subaccount_code !== "string"
      ) {
        const message =
          isRecord(payload) && typeof payload.message === "string"
            ? payload.message
            : "Payout setup could not be completed. Try again.";
        console.error(`[PaystackProvider.createSplitRecipient] status=${response.status}`, message);
        return { success: false, error: message };
      }

      return {
        success: true,
        data: {
          subaccountCode: payload.data.subaccount_code,
          accountName: typeof payload.data.account_name === "string"
            ? payload.data.account_name
            : undefined,
        },
      };
    } catch (error) {
      console.error("[PaystackProvider.createSplitRecipient] request failed", error);
      return { success: false, error: "Payout setup could not be completed. Try again." };
    }
  }

    async initializeTransaction(params: {
      amountKobo: number;
      email: string;
      reference: string;
      subaccountCode: string;
      callbackUrl: string;
    }): Promise<
      ProviderResult<{ authorizationUrl: string; reference: string }>
    > {
      const headers = this.headers;
      if (!headers) {
        return { success: false, error: "Payments are temporarily unavailable." };
      }

      try {
        const response = await fetch(
          "https://api.paystack.co/transaction/initialize",
          {
            method: "POST",
            headers,
            body: JSON.stringify({
              amount: params.amountKobo,
              email: params.email,
              reference: params.reference,
              subaccount: params.subaccountCode,
              callback_url: params.callbackUrl,
              currency: "NGN",
            }),
            cache: "no-store",
            signal: AbortSignal.timeout(10_000),
          },
        );
        const payload: unknown = await readJson(response);

        if (
          !response.ok ||
          !isRecord(payload) ||
          payload.status !== true ||
          !isRecord(payload.data) ||
          typeof payload.data.authorization_url !== "string" ||
          typeof payload.data.reference !== "string"
        ) {
          console.error(`[PaystackProvider.initializeTransaction] status=${response.status}`);
          return { success: false, error: "Payment could not be started. Try again." };
        }

        return {
          success: true,
          data: {
            authorizationUrl: payload.data.authorization_url,
            reference: payload.data.reference,
          },
        };
      } catch (error) {
        console.error("[PaystackProvider.initializeTransaction] request failed", error);
        return { success: false, error: "Payment could not be started. Try again." };
      }
    }

    async verifyTransaction(
      reference: string,
    ): Promise<ProviderResult<{ status: "success" | "failed" | "pending" }>> {
      const headers = this.headers;
      if (!headers) {
        return { success: false, error: "Payment verification is temporarily unavailable." };
      }

      try {
        const response = await fetch(
          `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
          { headers, cache: "no-store", signal: AbortSignal.timeout(8_000) },
        );
        if (response.status === 404) {
          return { success: true, data: { status: "failed" } };
        }
        const payload: unknown = await readJson(response);

        if (
          !response.ok ||
          !isRecord(payload) ||
          payload.status !== true ||
          !isRecord(payload.data) ||
          typeof payload.data.status !== "string"
        ) {
          console.error(`[PaystackProvider.verifyTransaction] status=${response.status}`);
          return { success: false, error: "Payment status could not be verified." };
        }

        const status =
          payload.data.status === "success"
            ? "success"
            : payload.data.status === "failed" ||
                payload.data.status === "abandoned" ||
                payload.data.status === "reversed"
              ? "failed"
              : "pending";

        return { success: true, data: { status } };
      } catch (error) {
        console.error("[PaystackProvider.verifyTransaction] request failed", error);
        return { success: false, error: "Payment status could not be verified." };
      }
    }

    verifyWebhookSignature(rawBody: string, signature: string): boolean {
      const secret = process.env.PAYSTACK_WEBHOOK_SECRET || process.env.PAYSTACK_SECRET_KEY;
      if (!secret || signature.length !== 128 || !/^[a-f0-9]+$/i.test(signature)) {
        return false;
      }

      const expected = crypto
        .createHmac("sha512", secret)
        .update(rawBody)
        .digest("hex");
      const actualBuffer = Buffer.from(signature, "hex");
      const expectedBuffer = Buffer.from(expected, "hex");

      return (
        actualBuffer.length === expectedBuffer.length &&
        crypto.timingSafeEqual(actualBuffer, expectedBuffer)
      );
    }

    parseWebhookEvent(
      rawBody: string,
    ): ProviderResult<PaymentWebhookEvent> {
      let payload: unknown;
      try {
        payload = JSON.parse(rawBody);
      } catch {
        return { success: false, error: "Invalid Paystack event." } as const;
      }

      if (!isRecord(payload) || typeof payload.event !== "string") {
        return { success: false, error: "Invalid Paystack event." } as const;
      }

      if (payload.event !== "charge.success" && payload.event !== "charge.failed") {
        return {
          success: true,
          data: { type: "ignored" },
        };
      }

      if (
        !isRecord(payload.data) ||
        (typeof payload.data.id !== "string" &&
          !(typeof payload.data.id === "number" &&
            Number.isSafeInteger(payload.data.id))) ||
        typeof payload.data.reference !== "string" ||
        payload.data.reference.length === 0
      ) {
        return { success: false, error: "Invalid Paystack event." } as const;
      }

      const eventId = `${payload.event}:${payload.data.id}`;
      if (payload.event === "charge.failed") {
        return {
          success: true,
          data: {
            type: "failed",
            eventId,
            reference: payload.data.reference,
          },
        };
      }

      if (
        payload.data.status !== "success" ||
        typeof payload.data.amount !== "number" ||
        !Number.isSafeInteger(payload.data.amount) ||
        typeof payload.data.currency !== "string"
      ) {
        return { success: false, error: "Invalid Paystack success event." } as const;
      }

      return {
        success: true,
        data: {
          type: "success",
          eventId,
          reference: payload.data.reference,
          amountKobo: payload.data.amount,
          currency: payload.data.currency,
        },
      };
    }
}

export const paymentProvider: PaymentProvider = new PaystackProvider();
