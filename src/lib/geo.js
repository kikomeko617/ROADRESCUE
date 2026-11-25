// Map helpers. Pure functions, so they run in the browser and on the server.
//
// Privacy: helpers are drawn near the CENTRE of their work area with a small fixed
// offset (worked out from their id). We never store or show anyone's real position.
// The customer's own GPS position, if they share it, stays in their browser: only the
// nearest area NAME is sent to the server.
import { AREA_COORDS } from "./constants.js";

export const KAMPALA = [0.3236, 32.5911];

export function areaCoords(area) {
  return AREA_COORDS[area] || KAMPALA;
}

// Same id -> same small offset every time (about 1 km at most).
export function jitter(id, spread = 0.009) {
  const n = Number(id) || 1;
  const a = Math.sin(n * 12.9898) * 43758.5453;
  const b = Math.sin(n * 78.233) * 12345.6789;
  return [((a - Math.floor(a)) - 0.5) * 2 * spread, ((b - Math.floor(b)) - 0.5) * 2 * spread];
}

export function approxPosition(area, id) {
  const [lat, lng] = areaCoords(area);
  const [dLat, dLng] = jitter(id);
  return [Number((lat + dLat).toFixed(5)), Number((lng + dLng).toFixed(5))];
}

// Straight-line distance in km (haversine).
export function distanceKm([lat1, lng1], [lat2, lng2]) {
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

export function nearestArea([lat, lng]) {
  let best = null;
  for (const [area, c] of Object.entries(AREA_COORDS)) {
    const d = distanceKm([lat, lng], c);
    if (!best || d < best.km) best = { area, km: d };
  }
  return best;
}

// Rough arrival time in Kampala traffic: about 2.5 minutes per km plus 5 minutes to set off.
export function etaMinutes(km) {
  return Math.max(5, Math.round(5 + km * 2.5));
}

export function formatKm(km) {
  if (km < 1) return "under 1 km";
  return `${km.toFixed(1)} km`;
}
