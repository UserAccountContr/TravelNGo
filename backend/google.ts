import { RouteOption } from '../frontend/src/types';

export function buildGoogleMapsUrl(route: RouteOption): string {
  const stops = route.itinerary;

  // --- Safety checks to satisfy TypeScript ---
  if (!stops || stops.length === 0) {
    throw new Error("Cannot build Google Maps URL: itinerary is empty");
  }

  const first = stops[0];
  const last = stops[stops.length - 1];

  if (!first || !last) {
    throw new Error("Cannot build Google Maps URL: missing first or last stop");
  }

  if (
    first.name === undefined ||
    first.address === undefined ||
    last.name === undefined ||
    last.address === undefined
  ) {
    throw new Error("Cannot build Google Maps URL: stop coordinates missing");
  }

  // --- Build origin & destination ---
  const origin = encodeURIComponent(`${first.name},${first.address}`);
  const destination = encodeURIComponent(`${last.name},${last.address}`);

  // --- Build waypoints safely ---
  const waypoints = stops
    .slice(1, -1)
    .filter(s => s && s.name !== undefined && s.address !== undefined)
    .map(s => encodeURIComponent(`${s.name},${s.address}`))
    .join('|');

  const modeMap: Record<string, string> = {
    walking: 'walking',
    transit: 'transit',
    driving: 'driving',
    bicycling: 'bicycling',
  };

  const travelmode = modeMap[route.transportMode] || 'walking';

  return (
    `https://www.google.com/maps/dir/?api=1` +
    `&origin=${origin}` +
    `&destination=${destination}` +
    (waypoints ? `&waypoints=${waypoints}` : '') +
    `&travelmode=${travelmode}`
  );
}
