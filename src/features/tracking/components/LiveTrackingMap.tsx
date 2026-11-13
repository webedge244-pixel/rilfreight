"use client";

import * as React from "react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import type { Shipment, TransportMode } from "@/shared/types";
import { partitionRoutePolyline } from "@/features/tracking/services/trackingService";

export interface LiveTrackingMapProps {
  shipment: Shipment;
  currentTimestamp?: number;
  height?: string;
  className?: string;
}

// Convert GeoJSON [lon, lat] to Leaflet [lat, lon]
function toLatLng(coord: [number, number]): [number, number] {
  return [coord[1], coord[0]];
}


// Mode-specific SVG glyphs
function getModeGlyph(mode: TransportMode): string {
  switch (mode) {
    case "air":
      // Swept-wing cargo aircraft
      return `<path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" fill="currentColor"/>`;
    case "rail":
      // Freight locomotive
      return `<path d="M12 2c-4 0-8 .5-8 4v9.5C4 17.43 5.57 19 7.5 19L6 20.5v.5h12v-.5L16.5 19c1.93 0 3.5-1.57 3.5-3.5V6c0-3.5-4-4-8-4zM7.5 17c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-6H6V7h12v4z" fill="currentColor"/>`;
    case "road":
      // Heavy commercial freight truck
      return `<path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-2 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" fill="currentColor"/>`;
    case "ocean":
    default:
      // Ocean container vessel / ship
      return `<path d="M20 21c-1.39 0-2.78-.47-4-1.32-2.44 1.71-5.56 1.71-8 0C6.78 20.53 5.39 21 4 21H2v2h2c1.38 0 2.74-.35 4-.99 2.52 1.29 5.48 1.29 8 0 1.26.65 2.62.99 4 .99h2v-2h-2zM3.95 19H4c1.6 0 3.02-.88 4-2 .98 1.12 2.4 2 4 2s3.02-.88 4-2c.98 1.12 2.4 2 4 2h.05l1.89-6.68c.08-.26.06-.54-.06-.78s-.33-.41-.6-.46L20 11.08V8h-2V6h-2V4h-4v2h-2v2H8v3.08l-1.28-.12c-.27.05-.48.22-.6.46s-.14.52-.06.78L3.95 19z" fill="currentColor"/>`;
  }
}

// Create the vehicle marker icon.
// No pulsing halo and no shadows: the design system forbids animated
// indicators and decorative elevation.
function createVehicleIcon(mode: TransportMode, isPaused: boolean) {
  const glyph = getModeGlyph(mode);
  const primaryColor = isPaused ? "#f59e0b" : "#0284c7";

  const html = `
    <div style="position:relative;width:44px;height:44px;display:flex;align-items:center;justify-content:center;">
      <!-- Static positioning ring -->
      <span style="position:absolute;width:100%;height:100%;border-radius:50%;background:${primaryColor}33;"></span>

      <!-- Core Badge -->
      <div style="position:relative;z-index:10;width:34px;height:34px;border-radius:50%;background:${primaryColor};border:2px solid #ffffff;display:flex;align-items:center;justify-content:center;color:#ffffff;">
        <svg viewBox="0 0 24 24" width="18" height="18" style="display:block;">
          ${glyph}
        </svg>
      </div>
    </div>
  `;

  return L.divIcon({
    className: "vehicle-icon",
    html,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -22],
  });
}

function createPinIcon(label: string, color: string) {
  return L.divIcon({
    className: "map-pin-icon",
    html: `
      <div style="cursor:pointer;display:flex;align-items:center;justify-content:center;">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="${color}" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
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
    className: "map-waypoint-icon",
    html: `
      <div style="cursor:pointer;display:flex;align-items:center;justify-content:center;">
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

export default function LiveTrackingMap({
  shipment,
  currentTimestamp,
  height = "520px",
  className = "",
}: LiveTrackingMapProps) {
  const mapContainerRef = React.useRef<HTMLDivElement | null>(null);
  const mapRef = React.useRef<L.Map | null>(null);
  const layersRef = React.useRef<L.LayerGroup | null>(null);

  // Partition polyline into solid completed and dashed upcoming legs
  const partition = React.useMemo(() => {
    return partitionRoutePolyline(shipment, currentTimestamp);
  }, [shipment, currentTimestamp]);

  const completedLatLngs = React.useMemo(() => {
    return partition.completedPolyline.map(toLatLng);
  }, [partition.completedPolyline]);

  const upcomingLatLngs = React.useMemo(() => {
    return partition.upcomingPolyline.map(toLatLng);
  }, [partition.upcomingPolyline]);

  const vehicleLatLng = React.useMemo(() => {
    return toLatLng(partition.vehicleCoordinate);
  }, [partition.vehicleCoordinate]);

  // Combined bounds covering the entire route
  const bounds = React.useMemo(() => {
    const allCoords = [...completedLatLngs, ...upcomingLatLngs];
    if (allCoords.length < 2) return null;
    return L.latLngBounds(allCoords.map((c) => L.latLng(c[0], c[1])));
  }, [completedLatLngs, upcomingLatLngs]);

  // Icons
  const vehicleIcon = React.useMemo(() => {
    return createVehicleIcon(shipment.mode, shipment.isPaused);
  }, [shipment.mode, shipment.isPaused]);

  const originIcon = React.useMemo(() => createPinIcon("A", "#10b981"), []);
  const destIcon = React.useMemo(() => createPinIcon("B", "#ba1c20"), []);
  const waypointIcon = React.useMemo(() => createWaypointIcon(), []);

  // Initialize map instance once on mount with strict cleanup
  React.useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;

    if ((container as unknown as { _leaflet_id?: number })._leaflet_id) {
      delete (container as unknown as { _leaflet_id?: number })._leaflet_id;
      container.innerHTML = "";
    }

    const map = L.map(container, {
      center: vehicleLatLng,
      zoom: 3,
      scrollWheelZoom: false,
      attributionControl: false,
    });

    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}",
      { maxZoom: 19 }
    ).addTo(map);

    const layers = L.layerGroup().addTo(map);
    mapRef.current = map;
    layersRef.current = layers;

    return () => {
      map.remove();
      mapRef.current = null;
      layersRef.current = null;
      if (container) {
        delete (container as unknown as { _leaflet_id?: number })._leaflet_id;
        container.innerHTML = "";
      }
    };
  }, []);

  // Update route polylines, markers, popups, and bounds whenever data changes
  React.useEffect(() => {
    const map = mapRef.current;
    const layers = layersRef.current;
    if (!map || !layers) return;

    layers.clearLayers();

    // 1. Solid Completed Route Leg
    if (completedLatLngs.length > 1) {
      L.polyline(completedLatLngs, {
        color: "#0284c7",
        weight: 4,
        opacity: 1.0,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(layers);
    }

    // 2. Dashed Upcoming Route Leg
    if (upcomingLatLngs.length > 1) {
      L.polyline(upcomingLatLngs, {
        color: "#94a3b8",
        weight: 3.5,
        opacity: 0.85,
        dashArray: "6, 8",
        lineCap: "round",
        lineJoin: "round",
      }).addTo(layers);
    }

    // Origin Marker
    if (shipment.originCoordinates) {
      const originPopup = `
        <div class="text-xs font-sans">
          <span class="font-bold text-emerald-600 uppercase tracking-wide">Origin Port</span>
          <p class="font-semibold text-slate-900 dark:text-white">${shipment.originName}</p>
          <p class="text-[11px] text-slate-500">${shipment.originCountry} (${shipment.originCode})</p>
        </div>
      `;
      L.marker(toLatLng(shipment.originCoordinates), { icon: originIcon })
        .bindPopup(originPopup)
        .addTo(layers);
    }

    // Destination Marker
    if (shipment.destinationCoordinates) {
      const destPopup = `
        <div class="text-xs font-sans">
          <span class="font-bold text-red-600 uppercase tracking-wide">Destination</span>
          <p class="font-semibold text-slate-900 dark:text-white">${shipment.destinationName}</p>
          <p class="text-[11px] text-slate-500">${shipment.destinationCountry} (${shipment.destinationCode})</p>
        </div>
      `;
      L.marker(toLatLng(shipment.destinationCoordinates), { icon: destIcon })
        .bindPopup(destPopup)
        .addTo(layers);
    }

    // Intermediate Waypoints
    (shipment.waypoints || []).forEach((wp) => {
      const wpPopup = `
        <div class="text-xs font-sans">
          <span class="font-bold text-cyan-600 uppercase tracking-wide">Transit Checkpoint</span>
          <p class="font-semibold text-slate-900 dark:text-white">${wp.name}</p>
          ${wp.notes ? `<p class="text-slate-500 text-[11px] mt-0.5">${wp.notes}</p>` : ""}
        </div>
      `;
      L.marker(toLatLng(wp.coordinates), { icon: waypointIcon })
        .bindPopup(wpPopup)
        .addTo(layers);
    });

    // 3. Live Vehicle Marker
    const formattedStatus = shipment.status.replace(/_/g, " ").toUpperCase();
    const statusBadgeClass = shipment.isPaused
      ? "bg-amber-100 text-amber-800"
      : "bg-sky-100 text-sky-800";
    const statusText = shipment.isPaused ? "ON HOLD" : formattedStatus;
    const pauseHtml =
      shipment.isPaused && shipment.pausedReason
        ? `<div class="mt-2 p-1.5 rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 text-[11px] text-amber-900 dark:text-amber-200">
             ⚠️ <strong>Pause Reason:</strong> ${shipment.pausedReason}
           </div>`
        : "";

    const vehiclePopup = `
      <div class="text-xs font-sans min-w-[180px]">
        <div class="flex items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-700 pb-1.5 mb-1.5">
          <span class="font-mono font-bold text-slate-900 dark:text-white">${shipment.conveyanceName}</span>
          <span class="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${statusBadgeClass}">
            ${statusText}
          </span>
        </div>
        <p class="text-slate-600 dark:text-slate-300">
          <strong class="text-slate-800 dark:text-white">Progress:</strong> ${partition.progressPercentage}%
        </p>
        <p class="text-slate-500 text-[11px] font-mono mt-0.5">
          Lat: ${partition.vehicleCoordinate[1].toFixed(4)}°, Lon: ${partition.vehicleCoordinate[0].toFixed(4)}°
        </p>
        ${pauseHtml}
      </div>
    `;

    L.marker(vehicleLatLng, { icon: vehicleIcon, zIndexOffset: 1000 })
      .bindPopup(vehiclePopup)
      .addTo(layers);

    if (bounds) {
      map.fitBounds(bounds, { padding: [45, 45], maxZoom: 12 });
    }
  }, [
    completedLatLngs,
    upcomingLatLngs,
    vehicleLatLng,
    bounds,
    shipment,
    partition,
    originIcon,
    destIcon,
    waypointIcon,
    vehicleIcon,
  ]);

  return (
    <div
      style={{ height }}
      className={`relative w-full rounded-3xl overflow-hidden bg-slate-950 ${className}`}
    >
      <div
        ref={mapContainerRef}
        style={{ height: "100%", width: "100%", zIndex: 0 }}
      />

      {/* Map Legend Overlay */}
      <div className="absolute bottom-4 left-4 z-[400] bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg text-[11px] flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className="w-5 h-1 bg-[#0284c7] rounded-full inline-block"></span>
          <span className="text-slate-700 dark:text-slate-300 font-medium">Completed Leg</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-5 h-1 border-b-2 border-dashed border-slate-400 inline-block"></span>
          <span className="text-slate-700 dark:text-slate-300 font-medium">Scheduled Leg</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className={`w-2.5 h-2.5 rounded-full inline-block ${
              shipment.isPaused ? "bg-amber-500 animate-pulse" : "bg-sky-600 animate-pulse"
            }`}
          ></span>
          <span className="text-slate-700 dark:text-slate-300 font-medium">Live Vessel</span>
        </div>
      </div>
    </div>
  );
}
