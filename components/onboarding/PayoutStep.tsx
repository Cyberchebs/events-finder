"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, Loader2, LockKeyhole } from "lucide-react";
import posthog from "posthog-js";
import { resolveBankAccount, savePayoutStep } from "@/actions/onboarding";
import { WizardStepFooter } from "@/components/onboarding/WizardStepFooter";
import type { Bank } from "@/lib/payment-provider";

type Props = {
  banks: Bank[];
  banksError: string | null;
  organizerId: string;
  payoutConfigured: boolean;
};

export function PayoutStep({
  banks,
  banksError,
  organizerId,
  payoutConfigured,
}: Props) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(banksError);
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);

  async function triggerVerification(selectedBank: string, accNum: string) {
    if (!selectedBank || accNum.length !== 10) {
      setAccountName(null);
      return;
    }

    setIsResolving(true);
    setError(null);
    setAccountName(null);

    try {
      const result = await resolveBankAccount({
        bankCode: selectedBank,
        accountNumber: accNum,
      });

      if (result.success) {
        setAccountName(result.data.accountName);
        setError(null);
      } else {
        setError(result.error);
        setAccountName(null);
      }
    } catch {
      setError("Could not verify account details.");
    } finally {
      setIsResolving(false);
    }
  }

  function handleBankChange(code: string) {
    setBankCode(code);
    if (code && accountNumber.length === 10) {
      void triggerVerification(code, accountNumber);
    } else {
      setAccountName(null);
    }
  }

  function handleAccountChange(rawDigits: string) {
    const digits = rawDigits.replace(/\D/g, "");
    setAccountNumber(digits);
    if (bankCode && digits.length === 10) {
      void triggerVerification(bankCode, digits);
    } else {
      setAccountName(null);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsPending(true);

    try {
      const formData = new FormData(event.currentTarget);
      const result = await savePayoutStep({
        bankCode: formData.get("bankCode") || bankCode,
        accountNumber: formData.get("accountNumber") || accountNumber,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      if (result.data.accountName) {
        setAccountName(result.data.accountName);
      }
      posthog.capture("organizer_onboarding_step_completed", {
        step_name: "payout",
        organizer_id: organizerId,
      });
      router.push("/onboarding/event");
    } catch (caughtError) {
      console.error("[onboarding:PayoutStep] submit failed", caughtError);
      setError("Payout setup could not be completed. Please try again.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1 className="text-[20px] font-extrabold tracking-[-0.03em] text-ink">
        Where should we send your money?
      </h1>
      <p className="mt-1 text-[12.5px] font-medium leading-5 text-ink-2">
        Paystack pays you directly after each sale. Tik-Booth&apos;s 20.3% is taken automatically.
      </p>

      {payoutConfigured ? (
        <div className="mt-5 flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-3 text-[11px] font-bold text-ink-2">
          <BadgeCheck aria-hidden="true" className="h-4 w-4 text-ok" />
          Your Paystack payout account is set up.
        </div>
      ) : (
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <label className="sr-only" htmlFor="payout-bank">Bank</label>
          <select
            className="h-10 min-w-0 rounded-lg border border-border bg-surface-2 px-3 text-[12px] font-medium text-ink focus:outline-none focus:ring-2 focus:ring-brand-line"
            id="payout-bank"
            name="bankCode"
            onChange={(e) => handleBankChange(e.target.value)}
            required
            value={bankCode}
          >
            <option disabled value="">Choose a bank</option>
            {banks.map((bank, index) => (
              <option key={bank.id ? `${bank.code}-${bank.id}` : `${bank.code}-${index}`} value={bank.code}>
                {bank.name}
              </option>
            ))}
          </select>
          <label className="sr-only" htmlFor="payout-account-number">Account number</label>
          <input
            autoComplete="off"
            className="h-10 min-w-0 rounded-lg border border-border bg-surface-2 px-3 text-[12px] font-medium text-ink placeholder:text-ink-3 focus:outline-none focus:ring-2 focus:ring-brand-line"
            id="payout-account-number"
            inputMode="numeric"
            maxLength={10}
            minLength={10}
            name="accountNumber"
            onChange={(e) => handleAccountChange(e.target.value)}
            pattern="[0-9]{10}"
            placeholder="10-digit account number"
            required
            type="text"
            value={accountNumber}
          />
        </div>
      )}

      {isResolving ? (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2.5 text-[10.5px] font-semibold text-ink-2">
          <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin text-brand" />
          Verifying account with Paystack...
        </div>
      ) : accountName ? (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-ok-soft px-3 py-2.5 text-[10.5px] font-semibold text-ok-ink">
          <BadgeCheck aria-hidden="true" className="h-4 w-4" />
          Account verified for {accountName}
        </div>
      ) : null}

      <div className="mt-4 flex items-start gap-2 rounded-lg bg-sunken px-3 py-2.5 text-[10.5px] font-semibold leading-4 text-ink-2">
        <LockKeyhole aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ink-3" />
        Your bank details are sent directly to Paystack for verification and are not stored by Tik-Booth. BVN is not requested.
      </div>

      {banks.length === 0 && !payoutConfigured ? (
        <p className="mt-3 text-[11px] font-semibold text-ink-2">
          The bank list is currently unavailable. Refresh this page to try again.
        </p>
      ) : null}

      {error ? (
        <p className="mt-3 text-[11px] font-semibold text-live" role="alert">
          {error}
        </p>
      ) : null}

      <WizardStepFooter
        disabled={!payoutConfigured && banks.length === 0}
        isPending={isPending}
        previousHref="/onboarding/profile"
        submitLabel="Save and continue"
      />
    </form>
  );
}
