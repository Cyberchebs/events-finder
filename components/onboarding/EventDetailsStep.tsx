"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ImagePlus, MapPin, Video } from "lucide-react";
import posthog from "posthog-js";
import {
  completeEventStep,
  saveEventStep,
} from "@/actions/onboarding";
import { uploadOnboardingImage } from "@/components/onboarding/imageUpload";
import { WizardStepFooter } from "@/components/onboarding/WizardStepFooter";
import type { EventDraftData } from "@/components/onboarding/types";
import { EVENT_CATEGORIES, EVENT_CITIES } from "@/lib/constants";

const inputClassName =
  "h-10 min-w-0 rounded-lg border border-border bg-surface-2 px-3 text-[12px] font-medium text-ink placeholder:text-ink-3 focus:outline-none focus:ring-2 focus:ring-brand-line";

type Props = {
  event: EventDraftData | null;
  createNew: boolean;
  isRepeatEvent: boolean;
  organizerId: string;
};

function getLocalDateTimeParts(value: string | null | undefined) {
  if (!value) {
    return { date: "", time: "" };
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return { date: "", time: "" };
  }

  const date = [
    parsed.getFullYear(),
    String(parsed.getMonth() + 1).padStart(2, "0"),
    String(parsed.getDate()).padStart(2, "0"),
  ].join("-");
  const time = [
    String(parsed.getHours()).padStart(2, "0"),
    String(parsed.getMinutes()).padStart(2, "0"),
  ].join(":");

  return { date, time };
}

function toIsoDateTime(date: FormDataEntryValue | null, time: FormDataEntryValue | null) {
  if (typeof date !== "string" || typeof time !== "string") {
    return "";
  }

  const parsed = new Date(`${date}T${time}`);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString();
}

export function EventDetailsStep({
  event,
  createNew,
  isRepeatEvent,
  organizerId,
}: Props) {
  const router = useRouter();
  const [savedEventId, setSavedEventId] = useState(event?.id ?? null);
  const [format, setFormat] = useState<"in_person" | "online">(
    event?.format ?? "in_person",
  );
  const [onlineJoinUrl, setOnlineJoinUrl] = useState(event?.onlineJoinUrl ?? "");
  const [city, setCity] = useState(
    EVENT_CITIES.find((option) => option === event?.city) ?? EVENT_CITIES[0],
  );
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const start = getLocalDateTimeParts(event?.starts_at);
  const end = getLocalDateTimeParts(event?.ends_at);

  async function handleSubmit(submitEvent: FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault();
    setError(null);
    setIsPending(true);

    try {
      const formData = new FormData(submitEvent.currentTarget);
      const saveResult = await saveEventStep({
        eventId: savedEventId ?? event?.id ?? null,
        createNew: createNew && !savedEventId && !event?.id,
        title: formData.get("title"),
        description: formData.get("description"),
        category: formData.get("category"),
        city: format === "in_person" ? city : null,
        format,
        venue: formData.get("venue"),
        onlineJoinUrl: format === "online" ? onlineJoinUrl : null,
        startsAt: toIsoDateTime(formData.get("startDate"), formData.get("startTime")),
        endsAt: toIsoDateTime(formData.get("endDate"), formData.get("endTime")),
      });

      if (!saveResult.success) {
        if (saveResult.eventId) {
          setSavedEventId(saveResult.eventId);
          router.replace(
            `/onboarding/event?eventId=${encodeURIComponent(saveResult.eventId)}`,
            { scroll: false },
          );
        }
        setError(saveResult.error);
        return;
      }

      const eventId = saveResult.data.eventId;
      setSavedEventId(eventId);
      router.replace(`/onboarding/event?eventId=${encodeURIComponent(eventId)}`, {
        scroll: false,
      });

      if (coverFile) {
        const uploadResult = await uploadOnboardingImage(
          coverFile,
          "event-cover",
          eventId,
        );
        if (!uploadResult.success) {
          setError(uploadResult.error);
          return;
        }
      }

      const completeResult = await completeEventStep(eventId);
      if (!completeResult.success) {
        setError(completeResult.error);
        return;
      }

      posthog.capture("organizer_onboarding_step_completed", {
        step_name: "event",
        organizer_id: organizerId,
      });
      router.push(`/onboarding/tiers?eventId=${encodeURIComponent(eventId)}`);
    } catch (caughtError) {
      console.error("[onboarding:EventDetailsStep] submit failed", caughtError);
      setError("We couldn't save your event. Please check the details and try again.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1 className="text-[20px] font-extrabold tracking-[-0.03em] text-ink">
        {isRepeatEvent ? "Event details" : "Your first event"}
      </h1>

      <div className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_150px]">
        <div className="flex min-w-0 flex-col gap-2">
          <label className="sr-only" htmlFor="event-title">Event title</label>
          <input
            className={inputClassName}
            defaultValue={event?.title ?? ""}
            id="event-title"
            maxLength={120}
            name="title"
            placeholder="Event title"
            required
            type="text"
          />

          {format === "in_person" ? (
            <>
              <label className="sr-only" htmlFor="event-city">City</label>
              <select
                className={inputClassName}
                id="event-city"
                onChange={(changeEvent) => {
                  const selectedCity = EVENT_CITIES.find(
                    (option) => option === changeEvent.target.value,
                  );
                  if (selectedCity) {
                    setCity(selectedCity);
                  }
                }}
                required
                value={city}
              >
                <option disabled value="">City</option>
                {EVENT_CITIES.map((cityOption) => (
                  <option key={cityOption} value={cityOption}>{cityOption}</option>
                ))}
              </select>
            </>
          ) : null}

          <input name="format" type="hidden" value={format} />
          <div aria-label="Event format" className="grid grid-cols-2 gap-2" role="group">
            <button
              aria-pressed={format === "in_person"}
              className={`flex h-9 items-center justify-center gap-1.5 rounded-lg border px-2 text-[11px] font-bold transition-colors ${
                format === "in_person"
                  ? "border-brand-line bg-brand-soft text-brand"
                  : "border-border bg-surface text-ink-2"
              }`}
              onClick={() => setFormat("in_person")}
              type="button"
            >
              <MapPin aria-hidden="true" className="h-3.5 w-3.5" />
              In person
            </button>
            <button
              aria-pressed={format === "online"}
              className={`flex h-9 items-center justify-center gap-1.5 rounded-lg border px-2 text-[11px] font-bold transition-colors ${
                format === "online"
                  ? "border-brand-line bg-brand-soft text-brand"
                  : "border-border bg-surface text-ink-2"
              }`}
              onClick={() => setFormat("online")}
              type="button"
            >
              <Video aria-hidden="true" className="h-3.5 w-3.5" />
              Online
            </button>
          </div>

          <label className="sr-only" htmlFor="event-location">
            {format === "in_person" ? "Venue address" : "Online event platform"}
          </label>
          <input
            className={inputClassName}
            defaultValue={event?.venue_address ?? ""}
            id="event-location"
            maxLength={250}
            name="venue"
            placeholder={format === "in_person" ? "Venue address" : "Online event platform"}
            required
            type="text"
          />
          {format === "online" ? (
            <div className="space-y-1">
              <label
                className="block text-[10px] font-bold text-ink-3"
                htmlFor="online-join-url"
              >
                Private join URL <span className="font-medium">(optional for drafts)</span>
              </label>
              <input
                autoComplete="url"
                className={inputClassName}
                id="online-join-url"
                maxLength={2048}
                name="onlineJoinUrl"
                onChange={(changeEvent) => setOnlineJoinUrl(changeEvent.target.value)}
                placeholder="https://..."
                type="url"
                value={onlineJoinUrl}
              />
              <p className="text-[10px] font-medium leading-4 text-ink-3">
                Required before publishing. Only issued ticket holders can access it, starting
                30 minutes before the event.
              </p>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-2">
            <label className="flex min-w-0 flex-col gap-1 text-[9px] font-bold text-ink-3">
              Starts — date
              <input
                className={inputClassName}
                defaultValue={start.date}
                min={new Date().toISOString().split("T")[0]}
                name="startDate"
                required
                type="date"
              />
            </label>
            <label className="flex min-w-0 flex-col gap-1 text-[9px] font-bold text-ink-3">
              Starts — time
              <input className={inputClassName} defaultValue={start.time} name="startTime" required type="time" />
            </label>
            <label className="flex min-w-0 flex-col gap-1 text-[9px] font-bold text-ink-3">
              Ends — date
              <input
                className={inputClassName}
                defaultValue={end.date}
                min={new Date().toISOString().split("T")[0]}
                name="endDate"
                required
                type="date"
              />
            </label>
            <label className="flex min-w-0 flex-col gap-1 text-[9px] font-bold text-ink-3">
              Ends — time
              <input className={inputClassName} defaultValue={end.time} name="endTime" required type="time" />
            </label>
          </div>

          <label className="sr-only" htmlFor="event-category">Category</label>
          <select
            className={inputClassName}
            defaultValue={event?.category ?? ""}
            id="event-category"
            name="category"
            required
          >
            <option disabled value="">Category</option>
            {EVENT_CATEGORIES.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>

          <label className="sr-only" htmlFor="event-description">Event description</label>
          <textarea
            className="min-h-20 resize-y rounded-lg border border-border bg-surface-2 px-3 py-2 text-[12px] font-medium text-ink placeholder:text-ink-3 focus:outline-none focus:ring-2 focus:ring-brand-line"
            defaultValue={event?.description ?? ""}
            id="event-description"
            maxLength={5000}
            name="description"
            placeholder="Event description"
            rows={3}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="relative flex min-h-[104px] cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border border-dashed border-line-2 bg-surface text-center text-[10px] font-bold text-ink-3 transition-colors hover:bg-surface-2">
            {event?.image_url && !coverFile ? (
              <Image
                alt="Current event cover"
                className="h-full min-h-[104px] w-full object-cover"
                fill
                sizes="(max-width: 768px) 100vw, 150px"
                src={event.image_url}
                unoptimized
              />
            ) : (
              <>
                <ImagePlus aria-hidden="true" className="h-5 w-5" />
                Cover image
              </>
            )}
            <input
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(change) => setCoverFile(change.currentTarget.files?.[0] ?? null)}
              type="file"
            />
          </label>
          {coverFile ? (
            <p className="truncate text-[9.5px] font-semibold text-ink-3">{coverFile.name}</p>
          ) : null}
          <p className="rounded-lg bg-sunken px-2.5 py-2 text-[9.5px] font-semibold leading-4 text-ink-2">
            End time determines when the event stops showing as Live.
          </p>
        </div>
      </div>

      {error ? (
        <p className="mt-3 text-[11px] font-semibold text-live" role="alert">
          {error}
        </p>
      ) : null}

      <WizardStepFooter
        isPending={isPending}
        previousHref={isRepeatEvent ? "/dashboard" : "/onboarding/payout"}
        submitLabel="Save and continue"
      />
    </form>
  );
}
