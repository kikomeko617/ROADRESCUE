"use client";
// Interactive map (Leaflet + OpenStreetMap tiles, turned navy with a CSS filter in globals.css).
// Shows helpers and garages, lets the customer pick their area, and can draw a route line.
// The map is an extra: every page that uses it also has a plain list or a dropdown.
import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import { KAMPALA } from "@/lib/geo";

// Free OpenStreetMap tiles: fine for a low-traffic prototype as long as the credit is shown.
// A real product should use a paid tile provider (see docs/DEPLOYMENT.md).
const TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const GARAGE_ICON =
  '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M12 3 2 8v2h20V8L12 3Zm-8 9v8h3v-5h10v5h3v-8H4Zm5 4v4h6v-4H9Z"/></svg>';

export default function LiveMap({
  points = [],
  areas = [],
  selectedArea = "",
  onSelectArea,
  you = null,
  route = null,
  fitKey = "",
  zoom = 12,
  label = "Map",
  className = "",
}) {
  const el = useRef(null);
  const mapRef = useRef(null);
  const leaflet = useRef(null);
  const layer = useRef(null);
  const fitted = useRef(null);
  const pick = useRef(onSelectArea);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  pick.current = onSelectArea;

  // Create the map once.
  useEffect(() => {
    let cancelled = false;
    import("leaflet")
      .then((mod) => {
        if (cancelled || !el.current || mapRef.current) return;
        const L = mod.default || mod;
        leaflet.current = L;
        const map = L.map(el.current, { zoomControl: false, scrollWheelZoom: false, center: KAMPALA, zoom });
        L.control.zoom({ position: "bottomright" }).addTo(map);
        L.tileLayer(TILES, { maxZoom: 19, attribution: ATTRIBUTION }).addTo(map);
        map.attributionControl.setPrefix(false);
        layer.current = L.layerGroup().addTo(map);
        mapRef.current = map;
        setReady(true);
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [zoom]);

  // Redraw the markers whenever the data changes.
  useEffect(() => {
    const L = leaflet.current;
    const map = mapRef.current;
    if (!ready || !L || !map) return;
    const group = layer.current;
    group.clearLayers();
    const bounds = [];

    for (const a of areas) {
      const selected = a.name === selectedArea;
      const m = L.marker([a.lat, a.lng], {
        icon: L.divIcon({ className: "leaflet-plain", html: `<span class="area-pin${selected ? " is-selected" : ""}">${esc(a.name)}</span>`, iconSize: null }),
        keyboard: true,
        title: `Choose ${a.name}`,
        // Area names sit above helper and garage pins so they can always be tapped.
        zIndexOffset: selected ? 3000 : 2000,
      });
      m.on("click", () => pick.current?.(a.name));
      m.addTo(group);
      bounds.push([a.lat, a.lng]);
    }

    for (const p of points) {
      const isGarage = p.kind === "garage";
      const html = isGarage
        ? `<span class="map-pin pin-garage">${GARAGE_ICON}</span>`
        : `<span class="map-pin pin-${esc(p.kind)}${p.online === false ? " is-offline" : ""}"><img src="${esc(p.avatar)}" alt="" width="36" height="36"></span>`;
      const m = L.marker([p.lat, p.lng], {
        icon: L.divIcon({ className: "leaflet-plain", html, iconSize: [44, 44], iconAnchor: [22, 22], popupAnchor: [0, -20] }),
        keyboard: true,
        title: p.title,
        zIndexOffset: isGarage ? 0 : 500,
      });
      m.bindPopup(`<strong>${esc(p.title)}</strong>${p.subtitle ? `<br><span>${esc(p.subtitle)}</span>` : ""}`);
      m.addTo(group);
      bounds.push([p.lat, p.lng]);
    }

    if (you) {
      L.marker(you, { icon: L.divIcon({ className: "leaflet-plain", html: '<span class="you-dot"></span>', iconSize: [22, 22], iconAnchor: [11, 11] }), title: "You are here", keyboard: false, zIndexOffset: 1000 }).addTo(group);
      bounds.push(you);
    }

    if (route) {
      L.polyline([route.from, route.to], { color: "#ff7a1a", weight: 4, opacity: 0.9, dashArray: "2 10", lineCap: "round", className: "route-line" }).addTo(group);
      bounds.push(route.from, route.to);
    }

    // Zoom to fit the first time, and again when the caller says the view should change.
    const key = `${fitKey}|${you ? "you" : ""}`;
    if (fitted.current !== key && bounds.length) {
      fitted.current = key;
      if (bounds.length === 1) map.setView(bounds[0], 14);
      else map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [ready, points, areas, selectedArea, you, route, fitKey]);

  // Glide to the chosen area.
  useEffect(() => {
    const a = areas.find((x) => x.name === selectedArea);
    if (ready && a && mapRef.current) mapRef.current.flyTo([a.lat, a.lng], 13, { duration: 0.9 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, selectedArea]);

  return (
    <div className={`map-shell ${className}`}>
      <div ref={el} className="map-canvas" role="region" aria-label={label} />
      {!ready && !failed && <div className="map-loading" aria-hidden="true">Loading map…</div>}
      {failed && <div className="map-loading">The map could not load. You can still use the list.</div>}
    </div>
  );
}
