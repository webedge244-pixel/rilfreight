"use client";

import * as React from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { TransportMode, RouteWaypoint } from "@/shared/types";
import { DEFAULT_MAP_STYLE_URL, getEnglishMapStyle } from "@/shared/lib/mapConfig";

// Configure local worker to avoid external CDN dependencies or bundling issues
if (typeof window !== "undefined") {
  maplibregl.setWorkerUrl("/maplibre-gl-worker.mjs");
}

export interface RouteMiniMapProps {
  routeCoordinates: [number, number][]; // [lon, lat] from routing engine
  origin?: { name: string; coordinates: [number, number] };
  destination?: { name: string; coordinates: [number, number] };
  waypoints?: RouteWaypoint[];
  mode?: TransportMode;
  height?: string;
  className?: string;
}

function getModeColor(mode: TransportMode = "ocean"): string {
  switch (mode) {
    case "ocean":
      return "#0284c7";
    case "air":
      return "#8b5cf6";
    case "rail":
      return "#f59e0b";
    case "road":
      return "#10b981";
    default:
      return "#0284c7";
  }
}

function createDOMMarker(html: string): HTMLElement {
  const el = document.createElement("div");
  el.className = "maplibre-custom-marker";
  el.innerHTML = html.trim();
  return el;
}

export default function RouteMiniMapLibre({
  routeCoordinates = [],
  origin,
  destination,
  waypoints = [],
  mode = "ocean",
  height = "380px",
  className = "",
}: RouteMiniMapProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const mapRef = React.useRef<maplibregl.Map | null>(null);
  const markersRef = React.useRef<maplibregl.Marker[]>([]);
  const [mapLoaded, setMapLoaded] = React.useState<boolean>(false);
  const [errorState, setErrorState] = React.useState<string | null>(null);

  // Initialize MapLibre GL Map
  React.useEffect(() => {
    if (!containerRef.current) return;

    let isCancelled = false;

    async function initMap() {
      try {
        const style = await getEnglishMapStyle(DEFAULT_MAP_STYLE_URL);
        if (isCancelled || !containerRef.current) return;

        const initialCenter = origin?.coordinates || [0, 20];

        const map = new maplibregl.Map({
          container: containerRef.current,
          style: style,
          center: initialCenter,
          zoom: 2,
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

          // Route Polyline Source
          map.addSource("route-source", {
            type: "geojson",
            data: {
              type: "Feature",
              properties: {},
              geometry: {
                type: "LineString",
                coordinates: routeCoordinates.length > 1 ? routeCoordinates : [],
              },
            },
          });

          // Casing/halo for crisp contrast
          map.addLayer({
            id: "route-casing",
            type: "line",
            source: "route-source",
            layout: {
              "line-cap": "round",
              "line-join": "round",
            },
            paint: {
              "line-color": "#ffffff",
              "line-width": 6,
              "line-opacity": 0.8,
            },
          });

          // Core route line
          const modeColor = getModeColor(mode);
          map.addLayer({
            id: "route-line",
            type: "line",
            source: "route-source",
            layout: {
              "line-cap": "round",
              "line-join": "round",
            },
            paint: {
              "line-color": modeColor,
              "line-width": 3.8,
              ...(mode === "air" ? { "line-dasharray": [3, 2.5] } : {}),
            },
          });

          mapRef.current = map;
          setMapLoaded(true);

          // Initial bounds fit if route or points exist
          const allPoints: [number, number][] = [];
          if (routeCoordinates.length > 1) {
            allPoints.push(...routeCoordinates);
          } else {
            if (origin?.coordinates) allPoints.push(origin.coordinates);
            if (destination?.coordinates) allPoints.push(destination.coordinates);
            waypoints.forEach((wp) => allPoints.push(wp.coordinates));
          }

          if (allPoints.length > 1) {
            const bounds = new maplibregl.LngLatBounds();
            allPoints.forEach((pt) => bounds.extend(pt));
            map.fitBounds(bounds, { padding: 45, maxZoom: 12, duration: 800 });
          }
        });
      } catch (err) {
        console.error("Failed to initialize RouteMiniMapLibre:", err);
        if (!isCancelled) {
          setErrorState("Could not load vector route preview.");
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

  // Update Polyline geometry and style when routeCoordinates or mode changes
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const source = map.getSource("route-source") as maplibregl.GeoJSONSource | undefined;
    if (source) {
      source.setData({
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: routeCoordinates.length > 1 ? routeCoordinates : [],
        },
      });
    }

    if (map.getLayer("route-line")) {
      const modeColor = getModeColor(mode);
      map.setPaintProperty("route-line", "line-color", modeColor);
      if (mode === "air") {
        map.setPaintProperty("route-line", "line-dasharray", [3, 2.5]);
      } else {
        map.setPaintProperty("route-line", "line-dasharray", [1, 0]);
      }
    }
  }, [routeCoordinates, mode, mapLoaded]);

  // Update Markers (Origin, Destination, Waypoints)
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    // Clear existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // 1. Origin Marker (Green Pin)
    if (origin?.coordinates) {
      const originEl = createDOMMarker(`
        <div style="cursor:pointer;display:flex;align-items:center;justify-content:center;filter:drop-shadow(0 2px 5px rgba(0,0,0,0.35));">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="#059669" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0z"/>
            <circle cx="12" cy="10" r="3" fill="#ffffff" stroke="none"/>
          </svg>
        </div>
      `);

      const originPopup = new maplibregl.Popup({ offset: 16, closeButton: false }).setHTML(`
        <div style="font-family:sans-serif;font-size:12px;padding:3px;">
          <span style="font-weight:700;color:#059669;text-transform:uppercase;font-size:10px;letter-spacing:0.5px;">Origin</span>
          <p style="font-weight:700;color:#0f172a;margin:2px 0 0;">${origin.name || "Origin Port"}</p>
        </div>
      `);

      const marker = new maplibregl.Marker({ element: originEl, anchor: "bottom" })
        .setLngLat(origin.coordinates)
        .setPopup(originPopup)
        .addTo(map);

      markersRef.current.push(marker);
    }

    // 2. Destination Marker (Red Pin)
    if (destination?.coordinates) {
      const destEl = createDOMMarker(`
        <div style="cursor:pointer;display:flex;align-items:center;justify-content:center;filter:drop-shadow(0 2px 5px rgba(0,0,0,0.35));">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="#BA1C20" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0z"/>
            <circle cx="12" cy="10" r="3" fill="#ffffff" stroke="none"/>
          </svg>
        </div>
      `);

      const destPopup = new maplibregl.Popup({ offset: 16, closeButton: false }).setHTML(`
        <div style="font-family:sans-serif;font-size:12px;padding:3px;">
          <span style="font-weight:700;color:#ba1c20;text-transform:uppercase;font-size:10px;letter-spacing:0.5px;">Destination</span>
          <p style="font-weight:700;color:#0f172a;margin:2px 0 0;">${destination.name || "Destination Port"}</p>
        </div>
      `);

      const marker = new maplibregl.Marker({ element: destEl, anchor: "bottom" })
        .setLngLat(destination.coordinates)
        .setPopup(destPopup)
        .addTo(map);

      markersRef.current.push(marker);
    }

    // 3. Waypoint Markers (Cyan Pins)
    waypoints.forEach((wp, idx) => {
      const wpEl = createDOMMarker(`
        <div style="cursor:pointer;display:flex;align-items:center;justify-content:center;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.25));">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#0284c7" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0z"/>
            <circle cx="12" cy="10" r="2.5" fill="#ffffff" stroke="none"/>
          </svg>
        </div>
      `);

      const wpPopup = new maplibregl.Popup({ offset: 14, closeButton: false }).setHTML(`
        <div style="font-family:sans-serif;font-size:11px;padding:3px;">
          <span style="font-weight:700;color:#0284c7;text-transform:uppercase;font-size:9px;letter-spacing:0.5px;">Waypoint #${idx + 1}</span>
          <p style="font-weight:700;color:#0f172a;margin:1px 0 0;">${wp.name}</p>
          ${wp.notes ? `<p style="font-size:10px;color:#64748b;margin:0;">${wp.notes}</p>` : ""}
        </div>
      `);

      const marker = new maplibregl.Marker({ element: wpEl, anchor: "bottom" })
        .setLngLat(wp.coordinates)
        .setPopup(wpPopup)
        .addTo(map);

      markersRef.current.push(marker);
    });

    // Auto-fit camera bounds to include route or endpoints
    const allCoords: [number, number][] = [];
    if (routeCoordinates.length > 1) {
      allCoords.push(...routeCoordinates);
    } else {
      if (origin?.coordinates) allCoords.push(origin.coordinates);
      if (destination?.coordinates) allCoords.push(destination.coordinates);
      waypoints.forEach((wp) => allCoords.push(wp.coordinates));
    }

    if (allCoords.length > 1) {
      const bounds = new maplibregl.LngLatBounds();
      allCoords.forEach((pt) => bounds.extend(pt));
      map.fitBounds(bounds, { padding: 45, maxZoom: 12, duration: 800 });
    }
  }, [origin, destination, waypoints, routeCoordinates, mapLoaded]);

  return (
    <div
      ref={containerRef}
      style={{ height, width: "100%" }}
      className={`relative rounded-2xl overflow-hidden bg-slate-900 ${className}`}
    >
      {!mapLoaded && !errorState && (
        <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center text-slate-400 gap-2 z-10">
          <div className="w-8 h-8 border-2 border-[#BA1C20] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-mono font-medium text-slate-300">
            Rendering English Vector Route Preview...
          </p>
        </div>
      )}

      {errorState && (
        <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center text-slate-400 gap-2 z-10 p-6 text-center">
          <p className="text-xs font-semibold text-rose-400">{errorState}</p>
        </div>
      )}
    </div>
  );
}
