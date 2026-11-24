"use client";
// Step 2 of a request: what do you drive? Make, type, model (optional) and colour (optional).
// The answer is saved to the customer's profile, so next time it's one tap.
import { useState } from "react";
import ActionForm from "./ActionForm";
import SubmitButton from "./SubmitButton";
import { saveVehicleAction } from "@/app/actions/request";
import { CAR_MAKES, MAKES, BODY_TYPES, CAR_COLOURS } from "@/lib/constants";
import { BODY_IMAGES, MAKE_IMAGES } from "@/lib/images";

const MONO = { BMW: "BMW", Volkswagen: "VW", "Mercedes-Benz": "MB", "Land Rover": "LR", Other: "+" };
const SWATCH = { White: "#f4f6fb", Silver: "#c3c9d4", Black: "#0d0f14", Grey: "#6b7280", Blue: "#2563eb", Red: "#dc2626", Green: "#16a34a", Other: "conic-gradient(#ff7a1a, #ffc233, #2dd4bf, #8b9cff, #ff7a1a)" };

export function BodyIcon({ type }) {
  const shapes = {
    Saloon: "M4 24 8 16l12-2 8-6h16l8 6 8 2v8Z",
    Hatchback: "M4 24 6 16l12-3 8-6h20l8 9 6 1v7Z",
    SUV: "M4 24V14l10-2 6-7h30l6 7 4 2v10Z",
    Pickup: "M4 24v-9l10-2 6-7h14v8h26v10Z",
    "Van / Minibus": "M4 24V9q0-4 5-4h39l10 9 2 2v8Z",
    Truck: "M4 24V4h36v20Zm36 0V10h12l8 7v7Z",
  };
  return (
    <svg viewBox="0 0 64 32" width="64" height="32" aria-hidden="true" className="body-icon">
      <path d={shapes[type]} fill="currentColor" />
      <circle cx="16" cy="25" r="4.5" fill="var(--bg)" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="49" cy="25" r="4.5" fill="var(--bg)" stroke="currentColor" strokeWidth="2.5" />
    </svg>
  );
}

export default function VehicleForm({ need, saved }) {
  const [make, setMake] = useState(saved?.vehicle_make || "");
  const models = CAR_MAKES[make] || [];
  return (
    <ActionForm action={saveVehicleAction} className="form vehicle-form">
      <input type="hidden" name="need" value={need} />

      <fieldset className="field-group">
        <legend>Make</legend>
        <div className="make-grid">
          {MAKES.map((m, i) => (
            <label key={m} className={`pick-tile make-tile${MAKE_IMAGES[m] ? " has-photo" : ""}`} style={{ "--i": i }}>
              <input type="radio" name="make" value={m} required checked={make === m} onChange={() => setMake(m)} />
              {MAKE_IMAGES[m] ? (
                <img className="tile-photo" src={MAKE_IMAGES[m]} alt="" width="400" height="300" loading="lazy" decoding="async" />
              ) : (
                <span className="make-mono" aria-hidden="true">
                  {MONO[m] || m[0]}
                </span>
              )}
              <span className="make-name">{m}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="field-group">
        <legend>Type of vehicle</legend>
        <div className="body-grid">
          {BODY_TYPES.map((b) => (
            <label key={b} className="pick-tile body-tile has-photo">
              <input type="radio" name="body" value={b} required defaultChecked={saved?.vehicle_body === b} />
              <img className="tile-photo" src={BODY_IMAGES[b]} alt="" width="600" height="375" loading="lazy" decoding="async" />
              <span className="body-label">
                <BodyIcon type={b} />
                {b}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-2">
        <div>
          <label htmlFor="model">
            Model <span className="hint">Optional, e.g. {models[0] || "Premio"}</span>
          </label>
          <input id="model" name="model" type="text" maxLength={30} list="model-list" autoComplete="off" defaultValue={saved?.vehicle_model || ""} placeholder={models.length ? models.slice(0, 3).join(", ") : "Model"} />
          <datalist id="model-list">
            {models.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
        </div>
        <fieldset className="field-group">
          <legend>
            Colour <span className="hint">Optional - helps your helper spot you</span>
          </legend>
          <div className="swatches">
            {CAR_COLOURS.map((c) => (
              <label key={c} className="swatch" title={c}>
                <input type="radio" name="colour" value={c} defaultChecked={saved?.vehicle_colour === c} />
                <span className="swatch-dot" style={{ background: SWATCH[c] }} aria-hidden="true" />
                <span className="sr-only">{c}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <SubmitButton className="btn btn-primary btn-lg" pendingText="Saving…">
        Continue →
      </SubmitButton>
    </ActionForm>
  );
}
