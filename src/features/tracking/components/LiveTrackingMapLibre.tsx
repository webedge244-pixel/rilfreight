"use client";

import * as React from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Shipment, TransportMode } from "@/shared/types";
import { partitionRoutePolyline } from "@/features/tracking/services/trackingService";
import { getEnglishMapStyle, DEFAULT_MAP_STYLE_URL } from "@/shared/lib/mapConfig";

export interface LiveTrackingMapLibreProps {
  shipment: Shipment;
  currentTimestamp?: number;
  height?: string;
  className?: string;
}

// Mode-specific SVG glyphs
function getModeGlyph(mode: TransportMode): string {
  switch (mode) {
    case "air":
      return `<path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" fill="currentColor"/>`;
    case "rail":
      return `<path d="M12 2c-4 0-8 .5-8 4v9.5C4 17.43 5.57 19 7.5 19L6 20.5v.5h12v-.5L16.5 19c1.93 0 3.5-1.57 3.5-3.5V6c0-3.5-4-4-8-4zM7.5 17c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-6H6V7h12v4z" fill="currentColor"/>`;
    case "road":
      return `<path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5S8.33 17 7.5 17zm13.5-9l1.96 2.5H17V9.5h2.5zm-2 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" fill="currentColor"/>`;
    case "ocean":
    default:
      return `<path d="M20 21c-1.39 0-2.78-.47-4-1.32-2.44 1.71-5.56 1.71-8 0C6.78 20.53 5.39 21 4 21H2v2h2c1.38 0 2.74-.35 4-.99 2.52 1.29 5.48 1.29 8 0 1.26.65 2.62.99 4 .99h2v-2h-2zM3.95 19H4c1.6 0 3.02-.88 4-2 .98 1.12 2.4 2 4 2s3.02-.88 4-2c.98 1.12 2.4 2 4 2h.05l1.89-6.68c.08-.26.06-.54-.06-.78s-.33-.41-.6-.46L20 11.08V8h-2V6h-2V4h-4v2h-2v2H8v3.08l-1.28-.12c-.27.05-.48.22-.6.46s-.14.52-.06.78L3.95 19z" fill="currentColor"/>`;
  }
}

// Ensure MapLibre Web Worker loads locally from Next.js public directory
if (typeof window !== "undefined" && typeof maplibregl.setWorkerUrl === "function") {
  maplibregl.setWorkerUrl("/maplibre-gl-worker.mjs");
}

function createDOMMarker(html: string): HTMLElement {
  const el = document.createElement("div");
  el.className = "maplibre-custom-marker";
  el.innerHTML = html;
  return el;
}

export default function LiveTrackingMapLibre({
  shipment,
  currentTimestamp,
  height = "560px",
  className = "",
}: LiveTrackingMapLibreProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const mapRef = React.useRef<maplibregl.Map | null>(null);
  const markersRef = React.useRef<maplibregl.Marker[]>([]);
  const [mapLoaded, setMapLoaded] = React.useState(false);
  const [errorState, setErrorState] = React.useState<string | null>(null);

  // Partition route coordinates into completed (solid) and upcoming (dashed) legs
  const partition = React.useMemo(() => {
    return partitionRoutePolyline(shipment, currentTimestamp);
  }, [shipment, currentTimestamp]);

  // Initialize MapLibre GL Map
  React.useEffect(() => {
    if (!containerRef.current) return;

    let isCancelled = false;

    async function initMap() {
      try {
        const style = await getEnglishMapStyle(DEFAULT_MAP_STYLE_URL);
        if (isCancelled || !containerRef.current) return;

        const map = new maplibregl.Map({
          container: containerRef.current,
          style: style,
          center: partition.vehicleCoordinate,
          zoom: 3,
          minZoom: 2.0,
          maxZoom: 18,
          attributionControl: false,
        });

        // Add standard navigation controls (Zoom +/- and Compass)
        map.addControl(
          new maplibregl.NavigationControl({ showCompass: true, showZoom: true }),
          "bottom-right"
        );

        map.on("load", () => {
          if (isCancelled) {
            map.remove();
            return;
          }

          // Disable repeating world copies (renders single world map; natively clamps horizontal bounds)
          map.setRenderWorldCopies(false);

          // 1. Completed Route Polyline Source & Layers
          map.addSource("route-completed", {
            type: "geojson",
            data: {
              type: "Feature",
              properties: {},
              geometry: {
                type: "LineString",
                coordinates: partition.completedPolyline,
              },
            },
          });

          // Casing/halo for crisp contrast over any terrain
          map.addLayer({
            id: "route-completed-casing",
            type: "line",
            source: "route-completed",
            layout: {
              "line-cap": "round",
              "line-join": "round",
            },
            paint: {
              "line-color": "#ffffff",
              "line-width": 7.5,
              "line-opacity": 0.85,
            },
          });

          map.addLayer({
            id: "route-completed-line",
            type: "line",
            source: "route-completed",
            layout: {
              "line-cap": "round",
              "line-join": "round",
            },
            paint: {
              "line-color": "#0284c7",
              "line-width": 4.5,
            },
          });

          // 2. Upcoming Route Polyline Source & Layer
          map.addSource("route-upcoming", {
            type: "geojson",
            data: {
              type: "Feature",
              properties: {},
              geometry: {
                type: "LineString",
                coordinates: partition.upcomingPolyline,
              },
            },
          });

          map.addLayer({
            id: "route-upcoming-line",
            type: "line",
            source: "route-upcoming",
            layout: {
              "line-cap": "round",
              "line-join": "round",
            },
            paint: {
              "line-color": "#94a3b8",
              "line-width": 3.5,
              "line-dasharray": [3, 2.5],
              "line-opacity": 0.9,
            },
          });

          mapRef.current = map;
          setMapLoaded(true);

          // Fit bounds to the full route with comfortable padding
          const route = shipment.routeCoordinates || [];
          if (route.length > 1) {
            const bounds = new maplibregl.LngLatBounds();
            route.forEach((coord) => bounds.extend(coord));
            map.fitBounds(bounds, { padding: 70, maxZoom: 13, duration: 1200 });
          }
        });
      } catch (err) {
        console.error("Failed to initialize MapLibre GL map:", err);
        if (!isCancelled) {
          setErrorState("Could not load high-performance vector tiles. Falling back...");
        }
      }
    }

    initMap();

    return () => {
      isCancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update Route Polyline Sources when Shipment / Time progresses
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const completedSource = map.getSource("route-completed") as maplibregl.GeoJSONSource | undefined;
    if (completedSource) {
      completedSource.setData({
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: partition.completedPolyline,
        },
      });
    }

    const upcomingSource = map.getSource("route-upcoming") as maplibregl.GeoJSONSource | undefined;
    if (upcomingSource) {
      upcomingSource.setData({
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: partition.upcomingPolyline,
        },
      });
    }
  }, [partition, mapLoaded]);

  // Manage Markers (Origin, Destination, Waypoints, Vehicle)
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    // Clear previous markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // 1. Origin Marker (Green Pin)
    if (shipment.originCoordinates) {
      const originEl = createDOMMarker(`
        <div style="cursor:pointer;display:flex;align-items:center;justify-content:center;">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="#059669" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0z"/>
            <circle cx="12" cy="10" r="3" fill="#ffffff" stroke="none"/>
          </svg>
        </div>
      `);

      const originPopup = new maplibregl.Popup({ offset: 18, closeButton: false }).setHTML(`
        <div style="font-family:sans-serif;font-size:12px;padding:4px;">
          <span style="font-weight:700;color:#059669;text-transform:uppercase;font-size:10px;letter-spacing:0.5px;">Origin Port</span>
          <p style="font-weight:700;color:#0f172a;margin:2px 0 0;">${shipment.originName}</p>
          <p style="font-size:11px;color:#64748b;margin:0;">${shipment.originCountry} (${shipment.originCode})</p>
        </div>
      `);

      const originMarker = new maplibregl.Marker({ element: originEl, anchor: "bottom" })
        .setLngLat(shipment.originCoordinates)
        .setPopup(originPopup)
        .addTo(map);

      markersRef.current.push(originMarker);
    }

    // 2. Destination Marker (Red Pin)
    if (shipment.destinationCoordinates) {
      const destEl = createDOMMarker(`
        <div style="cursor:pointer;display:flex;align-items:center;justify-content:center;">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="#BA1C20" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0z"/>
            <circle cx="12" cy="10" r="3" fill="#ffffff" stroke="none"/>
          </svg>
        </div>
      `);

      const destPopup = new maplibregl.Popup({ offset: 18, closeButton: false }).setHTML(`
        <div style="font-family:sans-serif;font-size:12px;padding:4px;">
          <span style="font-weight:700;color:#BA1C20;text-transform:uppercase;font-size:10px;letter-spacing:0.5px;">Destination Port</span>
          <p style="font-weight:700;color:#0f172a;margin:2px 0 0;">${shipment.destinationName}</p>
          <p style="font-size:11px;color:#64748b;margin:0;">${shipment.destinationCountry} (${shipment.destinationCode})</p>
        </div>
      `);

      const destMarker = new maplibregl.Marker({ element: destEl, anchor: "bottom" })
        .setLngLat(shipment.destinationCoordinates)
        .setPopup(destPopup)
        .addTo(map);

      markersRef.current.push(destMarker);
    }

    // 3. Intermediate Checkpoint Waypoints
    (shipment.waypoints || []).forEach((wp) => {
      const wpEl = createDOMMarker(`
        <div style="cursor:pointer;display:flex;align-items:center;justify-content:center;">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="#0284c7" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0z"/>
            <circle cx="12" cy="10" r="2.5" fill="#ffffff" stroke="none"/>
          </svg>
        </div>
      `);

      const wpPopup = new maplibregl.Popup({ offset: 14, closeButton: false }).setHTML(`
        <div style="font-family:sans-serif;font-size:11px;padding:3px;">
          <span style="font-weight:700;color:#0284c7;text-transform:uppercase;font-size:9px;letter-spacing:0.5px;">Transit Waypoint</span>
          <p style="font-weight:700;color:#0f172a;margin:1px 0 0;">${wp.name}</p>
          ${wp.notes ? `<p style="font-size:10px;color:#64748b;margin:0;">${wp.notes}</p>` : ""}
        </div>
      `);

      const wpMarker = new maplibregl.Marker({ element: wpEl, anchor: "bottom" })
        .setLngLat(wp.coordinates)
        .setPopup(wpPopup)
        .addTo(map);

      markersRef.current.push(wpMarker);
    });

    // 4. Vehicle Moving Marker (Vessel / Plane / Truck / Train)
    const primaryColor = shipment.isPaused ? "#f59e0b" : "#0284c7";
    const glyph = getModeGlyph(shipment.mode);

    const vehicleEl = createDOMMarker(`
      <div style="position:relative;width:44px;height:44px;display:flex;align-items:center;justify-content:center;cursor:pointer;">
        <!-- Static Outer Halo -->
        <span style="position:absolute;width:100%;height:100%;border-radius:50%;background:${primaryColor}33;"></span>

        <!-- Core Badge -->
        <div style="position:relative;z-index:10;width:34px;height:34px;border-radius:50%;background:${primaryColor};border:2px solid #ffffff;display:flex;align-items:center;justify-content:center;color:#ffffff;box-shadow:0 4px 12px rgba(0,0,0,0.25);">
          <svg viewBox="0 0 24 24" width="18" height="18" style="display:block;">
            ${glyph}
          </svg>
        </div>
      </div>
    `);

    const etaDate = shipment.actualDeliveryDate || shipment.estimatedDeliveryDate;
    const vehiclePopup = new maplibregl.Popup({ offset: 22, closeButton: false }).setHTML(`
      <div style="font-family:sans-serif;font-size:12px;padding:6px;min-width:180px;">
        <span style="font-weight:700;color:${primaryColor};text-transform:uppercase;font-size:10px;letter-spacing:0.5px;">
          ${shipment.isPaused ? "Shipment Paused / On Hold" : "Active Multimodal Transit"}
        </span>
        <p style="font-weight:800;color:#0f172a;margin:2px 0 0;font-size:13px;">${shipment.conveyanceName}</p>
        <p style="font-size:11px;color:#475569;margin:2px 0 4px;">
          ${shipment.voyageNumber ? `Voyage: ${shipment.voyageNumber} &bull; ` : ""}Mode: <strong>${shipment.mode.toUpperCase()}</strong>
        </p>
        <div style="border-top:1px solid #e2e8f0;padding-top:4px;margin-top:4px;font-size:11px;color:#64748b;">
          Progress: <strong style="color:#0f172a;">${partition.progressPercentage}%</strong> &bull; ETA: <strong style="color:#0f172a;">${new Date(etaDate).toLocaleDateString()}</strong>
        </div>
      </div>
    `);

    const vehicleMarker = new maplibregl.Marker({ element: vehicleEl, anchor: "center" })
      .setLngLat(partition.vehicleCoordinate)
      .setPopup(vehiclePopup)
      .addTo(map);

    markersRef.current.push(vehicleMarker);
  }, [shipment, partition, mapLoaded]);

  return (
    <div
      ref={containerRef}
      style={{ height, width: "100%" }}
      className={`relative rounded-3xl overflow-hidden ${className}`}
    >
      {!mapLoaded && !errorState && (
        <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center text-slate-400 gap-3 z-10">
          <div className="w-10 h-10 border-3 border-[#0284c7] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold tracking-wider uppercase text-slate-300">
            Rendering English Vector Topography & Geodesic Corridors...
          </p>
        </div>
      )}

      {errorState && (
        <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center text-slate-400 gap-2 z-10 p-6 text-center">
          <p className="text-sm font-semibold text-rose-400">{errorState}</p>
        </div>
      )}
    </div>
  );
}
