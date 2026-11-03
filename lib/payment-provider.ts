export type ProviderResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export type Bank = {
  id?: number;
  name: string;
  code: string;
};

export type TransactionStatus = "success" | "failed" | "pending";

export type PaymentWebhookEvent =
  | {
      type: "success";
      eventId: string;
      reference: string;
      amountKobo: number;
      currency: string;
    }
  | {
      type: "failed";
      eventId: string;
      reference: string;
    }
  | {
      type: "ignored";
    };

export interface PaymentProvider {
  listBanks(): Promise<ProviderResult<Bank[]>>;
  resolveAccount(params: {
    accountNumber: string;
    bankCode: string;
  }): Promise<ProviderResult<{ accountName: string }>>;
  createSplitRecipient(params: {
    businessName: string;
    bankCode: string;
    accountNumber: string;
  }): Promise<ProviderResult<{ subaccountCode: string; accountName?: string }>>;
  initializeTransaction(params: {
    amountKobo: number;
    email: string;
    reference: string;
    subaccountCode: string;
    callbackUrl: string;
  }): Promise<ProviderResult<{ authorizationUrl: string; reference: string }>>;
  verifyTransaction(
    reference: string,
  ): Promise<ProviderResult<{ status: TransactionStatus }>>;
  verifyWebhookSignature(rawBody: string, signature: string): boolean;
  parseWebhookEvent(rawBody: string): ProviderResult<PaymentWebhookEvent>;
}
