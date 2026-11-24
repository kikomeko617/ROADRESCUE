"use client";
// Home page map: every available mechanic, driver and partner garage, with filters
// and a "closest to you" list (the list is the accessible alternative to the map).
import { useMemo, useState } from "react";
import LiveMap from "./LiveMap";
import { useMyLocation } from "./useMyLocation";
import { avatarDataUri } from "@/lib/avatar";
import { KAMPALA, distanceKm, etaMinutes, formatKm } from "@/lib/geo";

const FILTERS = [
  ["mechanic", "Mechanics"],
  ["driver", "Drivers"],
  ["garage", "Garages"],
];
const LABEL = { mechanic: "Mechanic", driver: "Driver" };

export default function HomeMap({ helpers, garages }) {
  const [show, setShow] = useState({ mechanic: true, driver: true, garage: true });
  const { pos, status, busy, locate } = useMyLocation();

  const points = useMemo(
    () => [
      ...helpers
        .filter((h) => show[h.role])
        .map((h) => ({
          kind: h.role,
          lat: h.lat,
          lng: h.lng,
          title: h.name,
          subtitle: `${LABEL[h.role]} · ${h.area}${h.rating ? ` · ★ ${h.rating}` : ""}${h.is_online ? "" : " · offline"}`,
          avatar: avatarDataUri({ seed: h.id, kind: h.role, style: h.avatar_style }),
          online: h.is_online,
        })),
      ...(show.garage ? garages.map((g) => ({ kind: "garage", lat: g.lat, lng: g.lng, title: g.name, subtitle: `${g.area} · ${g.hours}` })) : []),
    ],
    [helpers, garages, show]
  );

  const nearest = useMemo(() => {
    const from = pos || KAMPALA;
    return helpers
      .filter((h) => h.is_online && show[h.role])
      .map((h) => ({ ...h, km: distanceKm(from, [h.lat, h.lng]) }))
      .sort((a, b) => a.km - b.km)
      .slice(0, 4);
  }, [helpers, pos, show]);

  return (
    <div className="map-layout">
      <LiveMap points={points} you={pos} label="Map of available mechanics, drivers and garages in Kampala" className="map-tall" />
      <div className="map-panel glass">
        <div className="map-filters" role="group" aria-label="Show on map">
          {FILTERS.map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`filter-chip chip-${key}`}
              aria-pressed={show[key]}
              onClick={() => setShow((s) => ({ ...s, [key]: !s[key] }))}
            >
              <span className="dot" aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>
        <button type="button" className="btn btn-ghost btn-block" onClick={locate} disabled={busy}>
          <LocateIcon /> {busy ? "Finding you…" : "Use my location"}
        </button>
        <p className="tiny muted" aria-live="polite">
          {status || "Your location stays on your device. We never save it."}
        </p>
        <h3 className="panel-title">{pos ? "Closest to you" : "Available now in Kampala"}</h3>
        <ul className="near-list">
          {nearest.map((h) => (
            <li key={h.id}>
              <img className="avatar-img" src={avatarDataUri({ seed: h.id, kind: h.role, style: h.avatar_style })} alt="" width="44" height="44" />
              <div>
                <strong>{h.name}</strong>
                <span className="tiny muted">
                  {LABEL[h.role]} · {h.area}
                </span>
              </div>
              <span className="near-meta">
                {pos ? formatKm(h.km) : h.rating ? `★ ${h.rating}` : "New"}
                {pos && <span className="tiny muted">~{etaMinutes(h.km)} min</span>}
              </span>
            </li>
          ))}
          {nearest.length === 0 && <li className="muted small">Nothing to show. Turn a filter back on.</li>}
        </ul>
      </div>
    </div>
  );
}

export function LocateIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="M12 2v3m0 14v3M2 12h3m14 0h3" />
      <circle cx="12" cy="12" r="6" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
    </svg>
  );
}
