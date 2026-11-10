export type NigeriaLocation = {
  label: string;
  venueAddress: string;
  city: string;
  latitude: number;
  longitude: number;
  countryCode: "ng";
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function parseGeoapifyLocation(value: unknown): NigeriaLocation | null {
  if (!isRecord(value)) {
    return null;
  }

  const properties = isRecord(value.properties) ? value.properties : value;
  const label = nonEmptyString(properties.formatted);
  const locality =
    nonEmptyString(properties.city) ??
    nonEmptyString(properties.town) ??
    nonEmptyString(properties.village) ??
    nonEmptyString(properties.municipality) ??
    nonEmptyString(properties.county) ??
    nonEmptyString(properties.state);
  const state = nonEmptyString(properties.state);
  const city = [locality, state]
    .filter((part, index, parts) => {
      if (!part) {
        return false;
      }
      return parts.findIndex(
        (candidate) => candidate?.toLocaleLowerCase() === part.toLocaleLowerCase(),
      ) === index;
    })
    .join(", ");
  const latitude = properties.lat;
  const longitude = properties.lon;

  if (
    !label ||
    label.length > 250 ||
    !city ||
    city.length > 120 ||
    properties.country_code !== "ng" ||
    typeof latitude !== "number" ||
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90 ||
    typeof longitude !== "number" ||
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }

  return {
    label,
    venueAddress: label,
    city,
    latitude,
    longitude,
    countryCode: "ng",
  };
}

export function getEventLocationLabel(
  venueAddress: string | null,
  city: string | null,
): string {
  const venue = venueAddress?.trim() ?? "";
  const cityName = city?.trim() ?? "";

  if (!venue) {
    return cityName;
  }
  if (!cityName || venue.toLocaleLowerCase().includes(cityName.toLocaleLowerCase())) {
    return venue;
  }
  return `${venue} · ${cityName}`;
}

export function getGoogleMapsDirectionsUrl(
  latitude: number | null,
  longitude: number | null,
  venueAddress: string | null,
  city: string | null,
): string {
  const destination =
    latitude !== null && longitude !== null
      ? `${latitude},${longitude}`
      : [venueAddress, city, "Nigeria"].filter(Boolean).join(", ");
  const url = new URL("https://www.google.com/maps/dir/");
  url.searchParams.set("api", "1");
  url.searchParams.set("destination", destination);
  return url.toString();
}

export function getGeoapifyStaticMapUrl(
  latitude: number,
  longitude: number,
  apiKey: string,
): string {
  const url = new URL("https://maps.geoapify.com/v1/staticmap");
  url.searchParams.set("style", "osm-bright");
  url.searchParams.set("width", "900");
  url.searchParams.set("height", "480");
  url.searchParams.set("center", `lonlat:${longitude},${latitude}`);
  url.searchParams.set("zoom", "16");
  url.searchParams.set("marker", `lonlat:${longitude},${latitude}`);
  url.searchParams.set("apiKey", apiKey);
  return url.toString();
}
