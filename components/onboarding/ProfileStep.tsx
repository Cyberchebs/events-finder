"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ImagePlus, Upload } from "lucide-react";
import posthog from "posthog-js";
import {
  completeProfileStep,
  saveOrganizerProfile,
} from "@/actions/onboarding";
import { uploadOnboardingImage } from "@/components/onboarding/imageUpload";
import { WizardStepFooter } from "@/components/onboarding/WizardStepFooter";
import type { OrganizerProfileData } from "@/components/onboarding/types";

type Props = {
  organizerId: string;
  profile: OrganizerProfileData | null;
};

export function ProfileStep({ organizerId, profile }: Props) {
  const router = useRouter();
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsPending(true);

    try {
      const formData = new FormData(event.currentTarget);
      const saveResult = await saveOrganizerProfile({
        organizerName: formData.get("organizerName"),
        organizerBio: formData.get("organizerBio"),
      });

      if (!saveResult.success) {
        setError(saveResult.error);
        return;
      }

      if (logoFile) {
        const uploadResult = await uploadOnboardingImage(logoFile, "organizer-logo");
        if (!uploadResult.success) {
          setError(uploadResult.error);
          return;
        }
      }

      const completeResult = await completeProfileStep();
      if (!completeResult.success) {
        setError(completeResult.error);
        return;
      }

      posthog.capture("organizer_onboarding_step_completed", {
        step_name: "profile",
        organizer_id: organizerId,
      });
      router.push("/onboarding/payout");
    } catch (caughtError) {
      console.error("[onboarding:ProfileStep] submit failed", caughtError);
      setError("We couldn't save your profile. Please try again.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1 className="text-[20px] font-extrabold tracking-[-0.03em] text-ink">
        Who&apos;s hosting?
      </h1>
      <p className="mt-1 text-[12.5px] font-medium leading-5 text-ink-2">
        This is the name attendees see on every event you publish.
      </p>

      <div className="mt-5 space-y-4">
        <label className="relative flex min-h-[78px] w-full cursor-pointer items-center gap-3 overflow-hidden rounded-xl border border-dashed border-line-2 bg-surface-2 px-3 py-3 text-ink-3 transition-colors hover:bg-sunken">
          {profile?.logo_url && !logoFile ? (
            <Image
              alt="Current organizer logo"
              className="h-12 w-12 rounded-lg object-cover"
              height={48}
              src={profile.logo_url}
              unoptimized
              width={48}
            />
          ) : (
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
              <Upload aria-hidden="true" className="h-4 w-4" />
            </span>
          )}
          <input
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(change) => setLogoFile(change.currentTarget.files?.[0] ?? null)}
            type="file"
          />
          <span>
            <span className="block text-[12px] font-bold text-brand">
              {logoFile ? "Logo selected" : "Upload logo"}
            </span>
            <span className="mt-0.5 block text-[10px] font-medium text-ink-3">
              PNG or JPG · Up to 2 MB
            </span>
          </span>
        </label>

        <div>
          <label className="mb-1.5 block text-[10px] font-bold text-ink-2" htmlFor="organizer-name">
            Organizer name
          </label>
          <input
            autoComplete="organization"
            className="h-10 w-full rounded-lg border border-border bg-surface-2 px-3 text-[12px] font-medium text-ink placeholder:text-ink-3 focus:outline-none focus:ring-2 focus:ring-brand-line"
            defaultValue={profile?.organizer_name ?? ""}
            id="organizer-name"
            maxLength={100}
            name="organizerName"
            placeholder="Organizer or brand name"
            required
            type="text"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-[10px] font-bold text-ink-2" htmlFor="organizer-bio">
            Bio
          </label>
          <textarea
            className="min-h-[88px] w-full resize-y rounded-lg border border-border bg-surface-2 px-3 py-2 text-[12px] font-medium text-ink placeholder:text-ink-3 focus:outline-none focus:ring-2 focus:ring-brand-line"
            defaultValue={profile?.organizer_bio ?? ""}
            id="organizer-bio"
            maxLength={500}
            name="organizerBio"
            placeholder="Tell guests what makes you, you."
            rows={3}
          />
          <p className="mt-1 text-[10px] font-semibold text-ink-3">
            Your name and introduction help guests recognize your events.
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-lg bg-brand-soft px-3 py-2.5 text-[10.5px] font-semibold leading-4 text-ink-2">
        <ImagePlus aria-hidden="true" className="h-4 w-4 shrink-0 text-ink-3" />
        Add a logo and short introduction to help attendees recognize your events.
      </div>

      {error ? (
        <p className="mt-3 text-[11px] font-semibold text-live" role="alert">
          {error}
        </p>
      ) : null}

      <WizardStepFooter
        isPending={isPending}
        submitLabel="Save and continue"
      />
    </form>
  );
}
