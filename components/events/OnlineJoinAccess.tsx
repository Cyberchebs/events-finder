"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { OnlineJoinLock } from "@/components/events/OnlineJoinLock";

type Props = {
  eventTitle: string;
  unlockAt: string;
  serverNow: string;
  isUnlocked: boolean;
  joinUrl: string | null;
};

function formatCountdown(milliseconds: number): string {
  const totalSeconds = Math.ceil(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");
}

export function OnlineJoinAccess({
  eventTitle,
  unlockAt,
  serverNow,
  isUnlocked,
  joinUrl,
}: Props) {
  const router = useRouter();
  const [now, setNow] = useState(() => Date.parse(serverNow));
  const millisecondsUntilUnlock = Math.max(0, Date.parse(unlockAt) - now);
  const hasReachedUnlockTime = millisecondsUntilUnlock === 0;

  useEffect(() => {
    const pageStartedAt = Date.now();
    const serverStartedAt = Date.parse(serverNow);
    const intervalId = window.setInterval(
      () => setNow(serverStartedAt + Date.now() - pageStartedAt),
      1000,
    );
    return () => window.clearInterval(intervalId);
  }, [serverNow]);

  useEffect(() => {
    if (isUnlocked || !hasReachedUnlockTime) {
      return;
    }

    router.refresh();
    const intervalId = window.setInterval(() => router.refresh(), 5000);
    return () => window.clearInterval(intervalId);
  }, [hasReachedUnlockTime, isUnlocked, router]);

  const mode = isUnlocked
    ? joinUrl
      ? "unlocked"
      : "unavailable"
    : "locked";

  return (
    <OnlineJoinLock
      countdownLabel={formatCountdown(millisecondsUntilUnlock)}
      eventTitle={eventTitle}
      joinUrl={isUnlocked ? joinUrl : null}
      mode={mode}
    />
  );
}
