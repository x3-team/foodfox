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

export function LabsMap({
  points,
  selected,
  onSelect,
  staticOnPhone = false,
}: {
  points: Branch[];
  selected: string;
  onSelect: (id: string) => void;
  /** M26: on phones the map is a static preview (no gestures) so it never captures the page scroll. */
  staticOnPhone?: boolean;
}) {
  const holder = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markers = useRef<Record<string, Marker>>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let dead = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (dead || !holder.current || mapRef.current) return;
      const still = staticOnPhone && window.matchMedia("(max-width: 1100px)").matches;
      const map = L.map(holder.current, {
        scrollWheelZoom: false,
        ...(still ? { dragging: false, touchZoom: false, doubleClickZoom: false, boxZoom: false, keyboard: false, zoomControl: false } : {}),
      }).setView([55.741, 37.655], 13);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap",
      }).addTo(map);
      mapRef.current = map;
      for (const point of points) {
        const icon = L.divIcon({
          className: "fox-pin",
          html: `<span data-pin="${point.id}"></span>`,
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        });
        const marker = L.marker([point.lat, point.lng], { icon }).addTo(map);
        marker.on("click", () => onSelect(point.id));
        markers.current[point.id] = marker;
      }
      if (!dead) setReady(true);
    })();
    return () => {
      dead = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markers.current = {};
    };
  }, [points, onSelect, staticOnPhone]);

  useEffect(() => {
    const map = mapRef.current;
    const point = points.find((item) => item.id === selected);
    if (!ready || !map || !point) return;
    map.flyTo([point.lat, point.lng], 15, { duration: 0.45 });
    holder.current?.querySelectorAll("[data-pin]").forEach((node) => {
      node.classList.toggle("is-on", node.getAttribute("data-pin") === selected);
    });
  }, [selected, points, ready]);

  return <div ref={holder} className="leaflet-map" data-map aria-label="Карта отделений" />;
}
