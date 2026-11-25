"use client";
// Step 3 of a request: where are you? Tap an area on the map, use your location,
// or pick from the list (works without the map too). Only the area name is saved.
import { useMemo, useState } from "react";
import ActionForm from "./ActionForm";
import SubmitButton from "./SubmitButton";
import LiveMap from "./LiveMap";
import { LocateIcon } from "./HomeMap";
import { useMyLocation } from "./useMyLocation";
import { saveAreaAction } from "@/app/actions/request";
import { AREAS, AREA_COORDS } from "@/lib/constants";
import { avatarDataUri } from "@/lib/avatar";

const AREA_PINS = AREAS.map((name) => ({ name, lat: AREA_COORDS[name][0], lng: AREA_COORDS[name][1] }));

export default function AreaPicker({ need, defaultArea = "", helpers = [], garages = [] }) {
  const [area, setArea] = useState(defaultArea);
  const { pos, status, busy, locate } = useMyLocation((_here, nearest) => setArea(nearest));

  const points = useMemo(
    () => [
      ...helpers.map((h) => ({
        kind: h.role,
        lat: h.lat,
        lng: h.lng,
        title: h.name,
        subtitle: `${h.area}${h.rating ? ` · ★ ${h.rating}` : ""}`,
        avatar: avatarDataUri({ seed: h.id, kind: h.role, style: h.avatar_style }),
        online: h.is_online,
      })),
      ...garages.map((g) => ({ kind: "garage", lat: g.lat, lng: g.lng, title: g.name, subtitle: g.area })),
    ],
    [helpers, garages]
  );

  return (
    <div className="map-layout">
      <LiveMap areas={AREA_PINS} selectedArea={area} onSelectArea={setArea} points={points} you={pos} label="Map of Kampala. Choose the area you are in." className="map-tall" />
      <ActionForm action={saveAreaAction} className="form map-panel glass">
        <input type="hidden" name="need" value={need} />
        <button type="button" className="btn btn-ghost btn-block" onClick={locate} disabled={busy}>
          <LocateIcon /> {busy ? "Finding you…" : "Use my location"}
        </button>
        <p className="tiny muted" aria-live="polite">
          {status || "Your exact location stays on your phone. We only save the area name."}
        </p>
        <div>
          <label htmlFor="area">Your area</label>
          <select id="area" name="area" required value={area} onChange={(e) => setArea(e.target.value)}>
            <option value="" disabled>
              Choose your area
            </option>
            {AREAS.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
          <span className="hint">Or tap an area name on the map.</span>
        </div>
        <SubmitButton className="btn btn-primary btn-block btn-lg" pendingText="Finding help…">
          {area ? `Show help in ${area}` : "Show help near me"} →
        </SubmitButton>
      </ActionForm>
    </div>
  );
}
