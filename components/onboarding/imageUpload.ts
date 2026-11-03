"use client";

import { createClient } from "@/utils/supabase/client";

export type OnboardingImagePurpose = "organizer-logo" | "event-cover" | "ticket-card";

type UploadResult =
  | { success: true; publicUrl: string }
  | { success: false; error: string };

const MAX_IMAGE_SIZE = 50 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function uploadOnboardingImage(
  file: File,
  purpose: OnboardingImagePurpose,
  recordId?: string,
): Promise<UploadResult> {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { success: false, error: "Choose a JPEG, PNG, or WebP image." };
  }
  if (file.size <= 0 || file.size > MAX_IMAGE_SIZE) {
    return { success: false, error: "Images must be 50 MB or smaller." };
  }

  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Please sign in again before uploading an image." };
    }

    const extension = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
    const sourcePath = `${user.id}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from("onboarding-image-uploads")
      .upload(sourcePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("[onboarding:imageUpload] staging upload failed", uploadError);
      return { success: false, error: "The image could not be uploaded. Try again." };
    }

    let response: Response;
    try {
      response = await fetch("/api/onboarding/images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourcePath, purpose, recordId }),
      });
    } catch (error) {
      console.error("[onboarding:imageUpload] image processing request failed", error);
      try {
        const { error: cleanupError } = await supabase.storage
          .from("onboarding-image-uploads")
          .remove([sourcePath]);
        if (cleanupError) {
          console.error("[onboarding:imageUpload] staging cleanup failed", cleanupError);
        }
      } catch (cleanupError) {
        console.error("[onboarding:imageUpload] staging cleanup failed", cleanupError);
      }
      return { success: false, error: "The image could not be processed. Try again." };
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch (parseError) {
      console.error("[onboarding:imageUpload] response parsing failed", parseError);
      payload = null;
    }

    if (
      !response.ok ||
      !isRecord(payload) ||
      payload.success !== true ||
      typeof payload.publicUrl !== "string"
    ) {
      const message =
        isRecord(payload) && typeof payload.error === "string"
          ? payload.error
          : "The image could not be processed. Try again.";
      return { success: false, error: message };
    }

    return { success: true, publicUrl: payload.publicUrl };
  } catch (error) {
    console.error("[onboarding:imageUpload] unexpected failure", error);
    return { success: false, error: "The image could not be uploaded. Try again." };
  }
}
