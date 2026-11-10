import Image from "next/image";
import { Navigation } from "lucide-react";
import {
  getGeoapifyStaticMapUrl,
  getGoogleMapsDirectionsUrl,
} from "@/lib/locations";

type Props = {
  venueAddress: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
};

const GEOAPIFY_API_KEY = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY;

export function VenueMap({
  venueAddress,
  city,
  latitude,
  longitude,
}: Props) {
  const hasCoordinates =
    latitude !== null &&
    longitude !== null &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude);
  const mapUrl =
    hasCoordinates && GEOAPIFY_API_KEY
      ? getGeoapifyStaticMapUrl(latitude, longitude, GEOAPIFY_API_KEY)
      : null;
  const directionsUrl = getGoogleMapsDirectionsUrl(
    latitude,
    longitude,
    venueAddress,
    city,
  );

  return (
    <div className="mt-4">
      {mapUrl ? (
        <>
          <div className="relative aspect-[16/9] overflow-hidden rounded-xl border border-border bg-surface-2">
            <Image
              alt={`Map showing ${venueAddress ?? "the event venue"}`}
              className="object-cover"
              fill
              sizes="(max-width: 768px) 100vw, 680px"
              src={mapUrl}
              unoptimized
            />
          </div>
          <p className="mt-2 text-[10px] font-medium text-ink-3">
            ©{" "}
            <a
              className="underline underline-offset-2 hover:text-ink-2"
              href="https://www.openstreetmap.org/copyright"
              rel="noreferrer"
              target="_blank"
            >
              OpenStreetMap contributors
            </a>{" "}
            · Powered by{" "}
            <a
              className="underline underline-offset-2 hover:text-ink-2"
              href="https://www.geoapify.com/"
              rel="noreferrer"
              target="_blank"
            >
              Geoapify
            </a>
          </p>
        </>
      ) : (
        <div className="flex aspect-[16/9] items-center justify-center rounded-xl border border-border bg-surface-2 px-5 text-center text-[12px] font-medium text-ink-3">
          {!GEOAPIFY_API_KEY
            ? "Map preview is unavailable until Geoapify is configured."
            : !hasCoordinates
              ? "A map is not available for this event yet."
              : "Map preview could not be prepared."}
        </div>
      )}

      <a
        className="mt-3 inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-line-2 bg-surface px-4 text-[12px] font-bold text-ink transition-colors hover:border-brand-line hover:text-brand"
        href={directionsUrl}
        rel="noreferrer"
        target="_blank"
      >
        <Navigation aria-hidden="true" className="h-4 w-4" />
        Get directions in Google Maps
      </a>
    </div>
  );
}
