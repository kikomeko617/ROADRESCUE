"use client";
// Asks the browser for the user's position (only when they press the button).
// The position stays in the browser: it is used to centre the map and pick the nearest
// area name. It is never sent to our server or saved.
import { useCallback, useState } from "react";
import { nearestArea } from "@/lib/geo";

const MAX_KM = 40; // further than this from any area = outside the Kampala pilot

export function useMyLocation(onFound) {
  const [pos, setPos] = useState(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  const locate = useCallback(() => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setStatus("This browser can't share your location. Pick your area instead.");
      return;
    }
    setBusy(true);
    setStatus("Finding you…");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setBusy(false);
        const here = [p.coords.latitude, p.coords.longitude];
        const near = nearestArea(here);
        if (!near || near.km > MAX_KM) {
          setPos(null);
          setStatus("You seem to be outside our Kampala pilot area, so we're showing Kampala.");
          return;
        }
        setPos(here);
        setStatus(`You're near ${near.area}.`);
        onFound?.(here, near.area);
      },
      (err) => {
        setBusy(false);
        setStatus(err.code === 1 ? "Location access was blocked. Pick your area instead." : "We couldn't find your location. Pick your area instead.");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  }, [onFound]);

  return { pos, status, busy, locate };
}
