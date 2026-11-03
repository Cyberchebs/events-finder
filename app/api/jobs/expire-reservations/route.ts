import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { paymentProvider } from "@/lib/paystack-provider";
import { createAdminClient } from "@/utils/supabase/admin";

const MAX_RESERVATIONS_PER_RUN = 25;
const VERIFICATION_CONCURRENCY = 5;

export const maxDuration = 60;

function isAuthorized(request: Request, secret: string): boolean {
  const supplied = request.headers.get("authorization") ?? "";
  const expectedBuffer = Buffer.from(`Bearer ${secret}`);
  const suppliedBuffer = Buffer.from(supplied);
  return (
    suppliedBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(suppliedBuffer, expectedBuffer)
  );
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("[api/jobs/expire-reservations] CRON_SECRET is missing");
    return NextResponse.json({ success: false }, { status: 503 });
  }
  if (!isAuthorized(request, cronSecret)) {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  try {
    const admin = createAdminClient();
    const { data: reservations, error } = await admin
      .from("reservations")
      .select("id")
      .eq("status", "pending")
      .lte("expires_at", new Date().toISOString())
      .order("expires_at", { ascending: true })
      .limit(MAX_RESERVATIONS_PER_RUN);

    if (error) {
      console.error("[api/jobs/expire-reservations] reservation query failed", error);
      return NextResponse.json({ success: false }, { status: 500 });
    }

    let released = 0;
    let retained = 0;
    let failed = 0;

    for (let offset = 0; offset < reservations.length; offset += VERIFICATION_CONCURRENCY) {
      const batch = reservations.slice(offset, offset + VERIFICATION_CONCURRENCY);
      const results = await Promise.all(
        batch.map(async (reservation) => {
          const verification = await paymentProvider.verifyTransaction(reservation.id);
          if (!verification.success) {
            return "failed" as const;
          }
          if (verification.data.status !== "failed") {
            return "retained" as const;
          }

          const { data: didRelease, error: releaseError } = await admin.rpc(
            "release_expired_reservation",
            { p_reservation_id: reservation.id },
          );
          if (releaseError) {
            console.error(
              "[api/jobs/expire-reservations] inventory release failed",
              releaseError,
            );
            return "failed" as const;
          }
          return didRelease ? "released" as const : "retained" as const;
        }),
      );

      for (const result of results) {
        if (result === "released") {
          released += 1;
        } else if (result === "retained") {
          retained += 1;
        } else {
          failed += 1;
        }
      }
    }

    return NextResponse.json({
      success: true,
      checked: reservations.length,
      released,
      retained,
      failed,
    });
  } catch (error) {
    console.error("[api/jobs/expire-reservations] unexpected failure", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
