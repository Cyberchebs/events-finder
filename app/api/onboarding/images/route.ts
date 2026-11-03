import { NextResponse } from "next/server";
import sharp from "sharp";
import { MAX_ONBOARDING_IMAGE_BYTES } from "@/lib/constants";
import { createClient } from "@/utils/supabase/server";

type ImageRequest =
  | { sourcePath: string; purpose: "organizer-logo" }
  | { sourcePath: string; purpose: "event-cover" | "ticket-card"; recordId: string };

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STAGING_PATH_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(?:jpg|png|webp)$/i;
const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp"]);
const MAX_OPTIMIZED_IMAGE_BYTES = 10 * 1024 * 1024;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseRequest(value: unknown): ImageRequest | null {
  if (!isRecord(value)) {
    return null;
  }

  const { sourcePath, purpose, recordId } = value;
  if (
    typeof sourcePath !== "string" ||
    !STAGING_PATH_PATTERN.test(sourcePath) ||
    (purpose !== "organizer-logo" &&
      purpose !== "event-cover" &&
      purpose !== "ticket-card")
  ) {
    return null;
  }

  if (purpose === "organizer-logo") {
    return recordId === undefined ? { sourcePath, purpose } : null;
  }

  if (typeof recordId !== "string" || !UUID_PATTERN.test(recordId)) {
    return null;
  }
  return { sourcePath, purpose, recordId };
}

export async function POST(request: Request) {
  let sourcePath: string | null = null;
  let uploadedTarget: { bucket: string; path: string } | null = null;
  let supabase: Awaited<ReturnType<typeof createClient>> | null = null;

  try {
    let requestBody: unknown;
    try {
      requestBody = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid image upload request." },
        { status: 400 },
      );
    }

    const input = parseRequest(requestBody);
    if (!input) {
      return NextResponse.json(
        { success: false, error: "Invalid image upload request." },
        { status: 400 },
      );
    }

    sourcePath = input.sourcePath;
    supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Please sign in before uploading an image." },
        { status: 401 },
      );
    }

    if (!input.sourcePath.startsWith(`${user.id}/`)) {
      return NextResponse.json(
        { success: false, error: "This image upload does not belong to your account." },
        { status: 403 },
      );
    }

    let targetBucket: string;
    let targetFolder: string;
    let currentImageUrl: string | null = null;
    let ticketEventId: string | null = null;

    if (input.purpose === "organizer-logo") {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, is_organizer, logo_url")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError || !profile?.is_organizer) {
        if (profileError) {
          console.error("[api/onboarding/images] organizer profile lookup failed", profileError);
        }
        return NextResponse.json(
          { success: false, error: "Complete your organizer profile before adding a logo." },
          { status: 403 },
        );
      }

      targetBucket = "organizer-logos";
      targetFolder = user.id;
      currentImageUrl = profile.logo_url;
    } else if (input.purpose === "event-cover") {
      const { data: event, error: eventError } = await supabase
        .from("events")
        .select("id, image_url")
        .eq("id", input.recordId)
        .eq("organizer_id", user.id)
        .eq("status", "draft")
        .maybeSingle();

      if (eventError || !event) {
        if (eventError) {
          console.error("[api/onboarding/images] event ownership lookup failed", eventError);
        }
        return NextResponse.json(
          { success: false, error: "We couldn't find your event draft." },
          { status: 404 },
        );
      }

      currentImageUrl = event.image_url;
      targetBucket = "event-images";
      targetFolder = `${user.id}/${event.id}`;
    } else {
      const { data: ticketType, error: tierError } = await supabase
        .from("ticket_types")
        .select("id, event_id, card_image_url")
        .eq("id", input.recordId)
        .maybeSingle();

      if (tierError || !ticketType) {
        if (tierError) {
          console.error("[api/onboarding/images] ticket tier lookup failed", tierError);
        }
        return NextResponse.json(
          { success: false, error: "We couldn't find your ticket tier." },
          { status: 404 },
        );
      }

      const { data: event, error: eventError } = await supabase
        .from("events")
        .select("id")
        .eq("id", ticketType.event_id)
        .eq("organizer_id", user.id)
        .eq("status", "draft")
        .maybeSingle();

      if (eventError || !event) {
        if (eventError) {
          console.error("[api/onboarding/images] ticket event ownership lookup failed", eventError);
        }
        return NextResponse.json(
          { success: false, error: "We couldn't find your ticket tier's draft event." },
          { status: 404 },
        );
      }

      currentImageUrl = ticketType.card_image_url;
      ticketEventId = event.id;
      targetBucket = "ticket-card-images";
      targetFolder = `${user.id}/${ticketType.id}`;
    }

    const { data: source, error: downloadError } = await supabase.storage
      .from("onboarding-image-uploads")
      .download(input.sourcePath);

    if (downloadError || !source) {
      if (downloadError) {
        console.error("[api/onboarding/images] staging image download failed", downloadError);
      }
      return NextResponse.json(
        { success: false, error: "We couldn't read the uploaded image. Please upload it again." },
        { status: 400 },
      );
    }

    if (source.size <= 0 || source.size > MAX_ONBOARDING_IMAGE_BYTES) {
      return NextResponse.json(
        { success: false, error: "Images must be 50 MB or smaller." },
        { status: 413 },
      );
    }

    let optimizedImage: Buffer;
    try {
      const sourceBuffer = Buffer.from(await source.arrayBuffer());
      const image = sharp(sourceBuffer, { limitInputPixels: 40_000_000 });
      const metadata = await image.metadata();

      if (
        !metadata.format ||
        !ALLOWED_FORMATS.has(metadata.format) ||
        !metadata.width ||
        !metadata.height
      ) {
        return NextResponse.json(
          { success: false, error: "Choose a valid JPEG, PNG, or WebP image." },
          { status: 415 },
        );
      }

      optimizedImage = await image
        .rotate()
        .resize({
          width: input.purpose === "ticket-card" ? 1200 : 1920,
          height: input.purpose === "ticket-card" ? 1200 : 1920,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: 82, effort: 5 })
        .toBuffer();
    } catch (imageError) {
      console.error("[api/onboarding/images] image decoding or optimization failed", imageError);
      return NextResponse.json(
        { success: false, error: "Choose a valid JPEG, PNG, or WebP image." },
        { status: 415 },
      );
    }

    if (optimizedImage.byteLength > MAX_OPTIMIZED_IMAGE_BYTES) {
      return NextResponse.json(
        { success: false, error: "This image could not be optimized to a safe size. Choose a smaller image." },
        { status: 413 },
      );
    }

    const targetPath = `${targetFolder}/${crypto.randomUUID()}.webp`;
    const { error: finalUploadError } = await supabase.storage
      .from(targetBucket)
      .upload(targetPath, optimizedImage, {
        contentType: "image/webp",
        upsert: false,
      });

    if (finalUploadError) {
      console.error("[api/onboarding/images] optimized image upload failed", finalUploadError);
      return NextResponse.json(
        { success: false, error: "We couldn't save the optimized image. Please try again." },
        { status: 500 },
      );
    }
    uploadedTarget = { bucket: targetBucket, path: targetPath };

    const { data: publicUrlData } = supabase.storage
      .from(targetBucket)
      .getPublicUrl(targetPath);
    const publicUrl = publicUrlData.publicUrl;

    let updateError: { message: string } | null = null;
    if (input.purpose === "organizer-logo") {
      const { data, error } = await supabase
        .from("profiles")
        .update({ logo_url: publicUrl })
        .eq("id", user.id)
        .select("id")
        .maybeSingle();
      updateError = error ?? (data ? null : { message: "Profile was not updated." });
    } else if (input.purpose === "event-cover") {
      const { data, error } = await supabase
        .from("events")
        .update({ image_url: publicUrl })
        .eq("id", input.recordId)
        .eq("organizer_id", user.id)
        .eq("status", "draft")
        .select("id")
        .maybeSingle();
      updateError = error ?? (data ? null : { message: "Event draft was not updated." });
    } else {
      if (!ticketEventId) {
        return NextResponse.json(
          { success: false, error: "We couldn't verify the ticket tier's event." },
          { status: 404 },
        );
      }
      const { data, error } = await supabase
        .from("ticket_types")
        .update({ card_image_url: publicUrl })
        .eq("id", input.recordId)
        .eq("event_id", ticketEventId)
        .select("id")
        .maybeSingle();
      updateError = error ?? (data ? null : { message: "Ticket tier was not updated." });
    }

    if (updateError) {
      console.error("[api/onboarding/images] image reference update failed", updateError);
      return NextResponse.json(
        { success: false, error: "The optimized image could not be attached to your profile or event." },
        { status: 500 },
      );
    }

    if (currentImageUrl && currentImageUrl !== publicUrl) {
      try {
        const previousUrl = new URL(currentImageUrl);
        const publicMarker = `/storage/v1/object/public/${targetBucket}/`;
        const markerIndex = previousUrl.pathname.indexOf(publicMarker);
        if (markerIndex >= 0) {
          const oldPath = decodeURIComponent(
            previousUrl.pathname.slice(markerIndex + publicMarker.length),
          );
          const { error: removeOldError } = await supabase.storage
            .from(targetBucket)
            .remove([oldPath]);
          if (removeOldError) {
            console.error("[api/onboarding/images] previous image cleanup failed", removeOldError);
          }
        }
      } catch (cleanupError) {
        console.error("[api/onboarding/images] previous image cleanup failed", cleanupError);
      }
    }

    uploadedTarget = null;
    return NextResponse.json({ success: true, publicUrl });
  } catch (error) {
    console.error("[api/onboarding/images] unexpected failure", error);
    return NextResponse.json(
      { success: false, error: "We couldn't process the image. Please try again." },
      { status: 500 },
    );
  } finally {
    if (supabase && sourcePath) {
      try {
        const { error } = await supabase.storage
          .from("onboarding-image-uploads")
          .remove([sourcePath]);
        if (error) {
          console.error("[api/onboarding/images] staging image cleanup failed", error);
        }
      } catch (cleanupError) {
        console.error("[api/onboarding/images] staging image cleanup failed", cleanupError);
      }
    }
    if (supabase && uploadedTarget) {
      try {
        const { error } = await supabase.storage
          .from(uploadedTarget.bucket)
          .remove([uploadedTarget.path]);
        if (error) {
          console.error("[api/onboarding/images] optimized image cleanup failed", error);
        }
      } catch (cleanupError) {
        console.error("[api/onboarding/images] optimized image cleanup failed", cleanupError);
      }
    }
  }
}
