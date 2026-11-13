"use client";

import * as React from "react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import type { TransportMode, RouteWaypoint } from "@/shared/types";

const TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export interface RouteMiniMapProps {
  routeCoordinates: [number, number][]; // [lon, lat] from routing engine
  origin?: { name: string; coordinates: [number, number] };
  destination?: { name: string; coordinates: [number, number] };
  waypoints?: RouteWaypoint[];
  mode?: TransportMode;
  height?: string;
  className?: string;
}

// Convert GeoJSON [lon, lat] to Leaflet [lat, lon]
function toLatLng(coord: [number, number]): [number, number] {
  return [coord[1], coord[0]];
}

// SVG Markers using L.divIcon
function createOriginIcon() {
  return L.divIcon({
    className: "custom-map-icon",
    html: `
      <div style="cursor:pointer;display:flex;align-items:center;justify-content:center;filter:drop-shadow(0 2px 5px rgba(0,0,0,0.35));">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="#10b981" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0z"/>
          <circle cx="12" cy="10" r="3" fill="#ffffff" stroke="none"/>
        </svg>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
  });
}

function createDestinationIcon() {
  return L.divIcon({
    className: "custom-map-icon",
    html: `
      <div style="cursor:pointer;display:flex;align-items:center;justify-content:center;filter:drop-shadow(0 2px 5px rgba(0,0,0,0.35));">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="#ba1c20" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0z"/>
          <circle cx="12" cy="10" r="3" fill="#ffffff" stroke="none"/>
        </svg>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
  });
}

function createWaypointIcon() {
  return L.divIcon({
    className: "custom-map-icon",
    html: `
      <div style="cursor:pointer;display:flex;align-items:center;justify-content:center;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.25));">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="#0284c7" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0z"/>
          <circle cx="12" cy="10" r="2.5" fill="#ffffff" stroke="none"/>
        </svg>
      </div>
    `,
    iconSize: [22, 22],
    iconAnchor: [11, 22],
    popupAnchor: [0, -22],
  });
}

// Build popup DOM directly so names are rendered as text, not injected HTML.
function createPopupContent(
  label: string,
  labelClassName: string,
  name: string,
  notes?: string
) {
  const root = document.createElement("div");
  root.className = "text-xs font-sans";

  const labelEl = document.createElement("span");
  labelEl.className = `font-bold ${labelClassName}`;
  labelEl.textContent = label;
  root.appendChild(labelEl);

  const nameEl = document.createElement("p");
  nameEl.className = "font-medium text-slate-800";
  nameEl.textContent = name;
  root.appendChild(nameEl);

  if (notes) {
    const notesEl = document.createElement("p");
    notesEl.className = "text-slate-500 text-[11px]";
    notesEl.textContent = notes;
    root.appendChild(notesEl);
  }

  return root;
}

export default function RouteMiniMap({
  routeCoordinates,
  origin,
  destination,
  waypoints = [],
  mode = "ocean",
  height = "380px",
  className = "",
}: RouteMiniMapProps) {
  const mapContainerRef = React.useRef<HTMLDivElement | null>(null);
  const mapRef = React.useRef<L.Map | null>(null);
  const overlayRef = React.useRef<L.LayerGroup | null>(null);

  // The parent passes a fresh fallback array when no route has been calculated
  // yet, so key the memo off the actual coordinate values instead of identity.
  const routeSignature = routeCoordinates
    .map(([lon, lat]) => `${lon},${lat}`)
    .join("|");

  // Transpose coordinates for Leaflet
  const leafletPolyline = React.useMemo(() => {
    if (!routeSignature) return [];
    return routeSignature.split("|").map((pair) => {
      const [lon, lat] = pair.split(",");
      return [Number(lat), Number(lon)] as [number, number];
    });
  }, [routeSignature]);

  // Compute map bounding box
  const bounds = React.useMemo(() => {
    if (leafletPolyline.length < 2) return null;
    return L.latLngBounds(leafletPolyline.map((c) => L.latLng(c[0], c[1])));
  }, [leafletPolyline]);

  // Modal Polyline Styles
  const polylineStyle = React.useMemo(() => {
    switch (mode) {
      case "ocean":
        return { color: "#0284c7", weight: 4, opacity: 0.85 };
      case "air":
        return { color: "#8b5cf6", weight: 3.5, opacity: 0.9, dashArray: "6, 8" };
      case "rail":
        return { color: "#f59e0b", weight: 4, opacity: 0.9 };
      case "road":
        return { color: "#10b981", weight: 4, opacity: 0.9 };
      default:
        return { color: "#0284c7", weight: 4, opacity: 0.85 };
    }
  }, [mode]);

  const originIcon = React.useMemo(() => createOriginIcon(), []);
  const destIcon = React.useMemo(() => createDestinationIcon(), []);
  const waypointIcon = React.useMemo(() => createWaypointIcon(), []);

  // Primitive values keep the overlay effect from re-running on every render.
  const originLat = origin?.coordinates?.[1] ?? null;
  const originLng = origin?.coordinates?.[0] ?? null;
  const destinationLat = destination?.coordinates?.[1] ?? null;
  const destinationLng = destination?.coordinates?.[0] ?? null;
  const originName = origin?.name ?? "";
  const destinationName = destination?.name ?? "";

  const initialCenterRef = React.useRef<[number, number]>(
    origin?.coordinates ? toLatLng(origin.coordinates) : [20, 0]
  );

  // Create the Leaflet map once. Removing it in cleanup lets StrictMode's
  // setup -> cleanup -> setup cycle rebuild a healthy map instead of leaving
  // a detached instance that child layers can no longer attach to.
  React.useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;

    const map = L.map(container, {
      center: initialCenterRef.current,
      zoom: 2,
      scrollWheelZoom: false,
    });

    L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION }).addTo(map);

    mapRef.current = map;
    overlayRef.current = L.layerGroup().addTo(map);

    return () => {
      map.remove();
      mapRef.current = null;
      overlayRef.current = null;
    };
  }, []);

  // Rebuild overlays whenever the route, endpoints, or waypoints change.
  React.useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;

    overlay.clearLayers();

    if (leafletPolyline.length > 1) {
      L.polyline(leafletPolyline, polylineStyle).addTo(overlay);
    }

    if (originLat !== null && originLng !== null) {
      L.marker([originLat, originLng], { icon: originIcon })
        .bindPopup(
          createPopupContent("Origin", "text-emerald-600", originName)
        )
        .addTo(overlay);
    }

    if (destinationLat !== null && destinationLng !== null) {
      L.marker([destinationLat, destinationLng], { icon: destIcon })
        .bindPopup(
          createPopupContent(
            "Destination",
            "text-red-600",
            destinationName
          )
        )
        .addTo(overlay);
    }

    for (const wp of waypoints) {
      L.marker(toLatLng(wp.coordinates), { icon: waypointIcon })
        .bindPopup(
          createPopupContent(
            "Waypoint / Passage",
            "text-cyan-600",
            wp.name,
            wp.notes
          )
        )
        .addTo(overlay);
    }
  }, [
    leafletPolyline,
    polylineStyle,
    originLat,
    originLng,
    originName,
    destinationLat,
    destinationLng,
    destinationName,
    waypoints,
    originIcon,
    destIcon,
    waypointIcon,
  ]);

  // Fit the view to the route bounds when they change.
  React.useEffect(() => {
    const map = mapRef.current;
    if (map && bounds) {
      map.fitBounds(bounds, { padding: [35, 35], maxZoom: 12 });
    }
  }, [bounds]);

  return (
    <div
      style={{ height }}
      className={`relative w-full rounded-2xl overflow-hidden bg-slate-900 ${className}`}
    >
      <div
        ref={mapContainerRef}
        style={{ height: "100%", width: "100%", zIndex: 0 }}
      />
    </div>
  );
}
