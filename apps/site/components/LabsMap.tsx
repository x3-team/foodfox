"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, Marker } from "leaflet";
import "leaflet/dist/leaflet.css";

export type Branch = {
  id: string;
  lab: string;
  address: string;
  metro: string;
  hours: string;
  lat: number;
  lng: number;
};

const esc = (text: string) => text.replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch] as string);

export function LabsMap({
  points,
  selected,
  onSelect,
  hovered = "",
  tooltip,
  fallback = false,
  staticOnPhone = false,
}: {
  points: Branch[];
  selected: string;
  onSelect: (id: string) => void;
  /** Figma 1257:931: hovering a branch card highlights its pin. */
  hovered?: string;
  /** Figma 1257:1002: the active pin carries a tooltip (two lines). */
  tooltip?: (point: Branch) => [string, string];
  /** Figma 1258:1083: when tiles cannot load, show «Карта не загрузилась» with a retry. */
  fallback?: boolean;
  /** M26: on phones the map is a static preview (no gestures) so it never captures the page scroll. */
  staticOnPhone?: boolean;
}) {
  const holder = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markers = useRef<Record<string, Marker>>({});
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const tipRef = useRef(tooltip);
  tipRef.current = tooltip;

  useEffect(() => {
    let dead = false;
    setReady(false);
    (async () => {
      let L: typeof import("leaflet");
      try {
        L = (await import("leaflet")).default;
      } catch {
        if (!dead && fallback) setFailed(true);
        return;
      }
      if (dead || !holder.current || mapRef.current) return;
      const still = staticOnPhone && window.matchMedia("(max-width: 1100px)").matches;
      const map = L.map(holder.current, {
        scrollWheelZoom: false,
        ...(still ? { dragging: false, touchZoom: false, doubleClickZoom: false, boxZoom: false, keyboard: false, zoomControl: false } : {}),
      }).setView([55.741, 37.655], 13);
      // G17: the map shows a shimmer skeleton until the first tiles arrive.
      holder.current.classList.add("is-sk");
      const tiles = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap",
      }).addTo(map);
      let loaded = false;
      let errors = 0;
      tiles.on("tileload", () => {
        loaded = true;
      });
      tiles.once("load", () => holder.current?.classList.remove("is-sk"));
      tiles.on("tileerror", () => {
        errors += 1;
        if (fallback && !loaded && errors >= 4 && !dead) setFailed(true);
      });
      mapRef.current = map;
      points.forEach((point, index) => {
        const icon = L.divIcon({
          className: "fox-pin",
          html: `<span data-pin="${point.id}" style="--i:${index}"></span>`,
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        });
        const marker = L.marker([point.lat, point.lng], { icon }).addTo(map);
        marker.on("click", () => onSelect(point.id));
        markers.current[point.id] = marker;
      });
      if (!dead) setReady(true);
    })();
    return () => {
      dead = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markers.current = {};
    };
  }, [points, onSelect, staticOnPhone, fallback, attempt]);

  useEffect(() => {
    const map = mapRef.current;
    const point = points.find((item) => item.id === selected);
    if (!ready || !map || !point) return;
    map.flyTo([point.lat, point.lng], 15, { duration: 0.45 });
    for (const [id, marker] of Object.entries(markers.current)) marker.setZIndexOffset(id === selected ? 1000 : 0);
    holder.current?.querySelectorAll<HTMLElement>("[data-pin]").forEach((node) => {
      const on = node.getAttribute("data-pin") === selected;
      node.classList.toggle("is-on", on);
      node.querySelector(".fox-tip")?.remove();
      const tip = on ? tipRef.current?.(point) : undefined;
      if (tip) {
        const box = document.createElement("b");
        box.className = "fox-tip";
        box.innerHTML = `<strong>${esc(tip[0])}</strong><small>${esc(tip[1])}</small>`;
        node.appendChild(box);
      }
    });
  }, [selected, points, ready]);

  useEffect(() => {
    if (!ready) return;
    holder.current?.querySelectorAll<HTMLElement>("[data-pin]").forEach((node) => {
      node.classList.toggle("is-hover", !!hovered && node.getAttribute("data-pin") === hovered);
    });
    const marker = hovered ? markers.current[hovered] : undefined;
    if (marker && hovered !== selected) marker.setZIndexOffset(900);
    return () => {
      if (marker && hovered !== selected) marker.setZIndexOffset(0);
    };
  }, [hovered, selected, ready]);

  return (
    <>
      <div ref={holder} key={attempt} className="leaflet-map" data-map aria-label="Карта отделений" />
      {failed && (
        <div className="map-fail" role="status">
          <span className="map-fail-icon"><img src="/figma/labs/state/pin-error.svg" alt="" /></span>
          <p className="map-fail-title">Карта не загрузилась</p>
          <p className="map-fail-text">Список отделений работает — можно выбрать по адресу или метро.</p>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              setFailed(false);
              setAttempt((value) => value + 1);
            }}
          >
            Попробовать снова
          </button>
        </div>
      )}
    </>
  );
}
