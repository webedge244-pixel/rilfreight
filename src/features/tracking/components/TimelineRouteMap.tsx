"use client";

import * as React from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { RouteWaypoint, TrackingMilestone, TransportMode } from "@/shared/types";
import { DEFAULT_MAP_STYLE_URL, getEnglishMapStyle } from "@/shared/lib/mapConfig";
import {
  splitLineAtFraction,
  splitAtAntimeridian,
  unwrapLongitudes,
  projectOntoRoute,
  type Coordinate,
} from "@/features/tracking/lib/geo";
import {
  resolveTimelineMapState,
  type TimelineMapState,
  type TimelineStop,
} from "@/features/tracking/lib/timelineStops";
import { useTimelineLegs } from "@/features/tracking/hooks/useTimelineLegs";
import type { TimelineLeg } from "@/shared/types/timeline";

if (typeof window !== "undefined" && typeof maplibregl.setWorkerUrl === "function") {
  maplibregl.setWorkerUrl("/maplibre-gl-worker.mjs");
}

export interface TimelineRouteMapPlace {
  name: string;
  code?: string;
  country?: string;
  coordinates: Coordinate;
}

export interface TimelineRouteMapProps {
  mode: TransportMode;
  milestones?: TrackingMilestone[];
  origin: TimelineRouteMapPlace;
  destination: TimelineRouteMapPlace;
  waypoints?: RouteWaypoint[];
  routeCoordinates?: Coordinate[];
  paused?: boolean;
  pausedCoordinates?: Coordinate | null;
  showVehicle?: boolean;
  preview?: boolean;
  height?: string;
  className?: string;
  vehicleTitle?: string;
  vehicleSubtitle?: string;
  fitPadding?: { top: number; bottom: number; left: number; right: number };
  legendClassName?: string;
}

const DEFAULT_FIT_PADDING = { top: 64, bottom: 64, left: 64, right: 64 };

const MODE_LABEL: Record<TransportMode, string> = {
  ocean: "Ocean Freight",
  air: "Air Freight",
  rail: "Rail Freight",
  road: "Road Freight",
};

const MODE_GLYPH: Record<TransportMode, string> = {
  air: '<path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" fill="currentColor"/>',
  rail: '<path d="M12 2c-4 0-8 .5-8 4v9.5C4 17.43 5.57 19 7.5 19L6 20.5v.5h12v-.5L16.5 19c1.93 0 3.5-1.57 3.5-3.5V6c0-3.5-4-4-8-4zM7.5 17c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-6H6V7h12v4z" fill="currentColor"/>',
  road: '<path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5S8.33 17 7.5 17zm13.5-9l1.96 2.5H17V9.5h2.5zm-2 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" fill="currentColor"/>',
  ocean:
    '<path d="M20 21c-1.39 0-2.78-.47-4-1.32-2.44 1.71-5.56 1.71-8 0C6.78 20.53 5.39 21 4 21H2v2h2c1.38 0 2.74-.35 4-.99 2.52 1.29 5.48 1.29 8 0 1.26.65 2.62.99 4 .99h2v-2h-2zM3.95 19H4c1.6 0 3.02-.88 4-2 .98 1.12 2.4 2 4 2s3.02-.88 4-2c.98 1.12 2.4 2 4 2h.05l1.89-6.68c.08-.26.06-.54-.06-.78s-.33-.41-.6-.46L20 11.08V8h-2V6h-2V4h-4v2h-2v2H8v3.08l-1.28-.12c-.27.05-.48.22-.6.46s-.14.52-.06.78L3.95 19z" fill="currentColor"/>',
};

const CHECK_SVG =
  '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';

function formatEventTime(timestampMs: number): string {
  if (!timestampMs) return "";
  return new Date(timestampMs).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function createStopPopup(stop: TimelineStop): HTMLElement {
  const root = document.createElement("div");
  root.style.fontFamily = "ui-sans-serif, system-ui, sans-serif";
  root.style.minWidth = "210px";
  root.style.maxWidth = "260px";

  const eyebrow = document.createElement("span");
  eyebrow.textContent = stop.isHoldGate && stop.status === "active"
    ? "AWAITING RELEASE"
    : stop.status === "completed"
    ? "CHECKPOINT CLEARED"
    : stop.status === "active"
    ? "CURRENT CHECKPOINT"
    : "PLANNED CHECKPOINT";
  eyebrow.style.cssText = `display:block;font-size:9px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:${
    stop.isHoldGate && stop.status === "active" ? "#B45309" : "#64748b"
  };`;
  root.appendChild(eyebrow);

  const title = document.createElement("p");
  title.textContent = stop.name;
  title.style.cssText = "margin:3px 0 0;font-size:13px;font-weight:800;color:#0f172a;";
  root.appendChild(title);

  const metaParts = [stop.code, stop.isOrigin ? "Origin" : stop.isDestination ? "Destination" : null].filter(
    Boolean
  );
  if (metaParts.length > 0) {
    const meta = document.createElement("p");
    meta.textContent = metaParts.join(" · ");
    meta.style.cssText = "margin:1px 0 0;font-size:10px;color:#64748b;font-family:ui-monospace,monospace;";
    root.appendChild(meta);
  }

  if (stop.events.length > 0) {
    const list = document.createElement("div");
    list.style.cssText = "margin-top:6px;border-top:1px solid #e2e8f0;padding-top:5px;display:flex;flex-direction:column;gap:3px;";
    for (const event of stop.events) {
      const row = document.createElement("div");
      row.style.cssText = "display:flex;align-items:flex-start;gap:5px;";

      const dot = document.createElement("span");
      dot.textContent = event.isCompleted ? "✓" : "○";
      dot.style.cssText = `font-size:9px;line-height:14px;font-weight:700;color:${
        event.isCompleted ? "#0F313A" : "#94a3b8"
      };`;
      row.appendChild(dot);

      const body = document.createElement("div");
      body.style.cssText = "display:flex;flex-direction:column;gap:1px;";

      const label = document.createElement("span");
      label.textContent = `${event.code} · ${event.title}`;
      label.style.cssText = `font-size:10px;line-height:1.3;font-weight:600;color:${
        event.isCompleted ? "#334155" : "#94a3b8"
      };`;
      body.appendChild(label);

      const time = document.createElement("span");
      time.textContent = formatEventTime(event.timestampMs);
      time.style.cssText = "font-size:9px;color:#94a3b8;font-family:ui-monospace,monospace;";
      body.appendChild(time);

      row.appendChild(body);
      list.appendChild(row);
    }
    root.appendChild(list);
  }

  return root;
}

function createStopElement(stop: TimelineStop): HTMLElement {
  const size = stop.isOrigin || stop.isDestination ? 24 : 18;

  const root = document.createElement("div");
  root.style.cssText = `width:${size}px;height:${size}px;cursor:pointer;display:flex;align-items:center;justify-content:center;`;

  const dot = document.createElement("div");
  const base = `width:${size}px;height:${size}px;border-radius:9999px;display:flex;align-items:center;justify-content:center;border:2px solid #ffffff;box-shadow:0 2px 6px rgba(15,23,42,.28);transition:background .2s;`;

  if (stop.isHoldGate && stop.status === "active") {
    dot.style.cssText = `${base}background:#B45309;`;
    dot.innerHTML = CHECK_SVG;
  } else if (stop.status === "completed") {
    dot.style.cssText = `${base}background:#0F313A;`;
    dot.innerHTML = CHECK_SVG;
  } else if (stop.status === "active") {
    dot.style.cssText = `${base}background:#BA1C20;`;
    const inner = document.createElement("span");
    inner.style.cssText = "width:6px;height:6px;border-radius:9999px;background:#ffffff;";
    dot.appendChild(inner);
  } else {
    dot.style.cssText = `${base}background:#ffffff;border-color:#94a3b8;`;
    const inner = document.createElement("span");
    inner.style.cssText = "width:5px;height:5px;border-radius:9999px;background:#94a3b8;";
    dot.appendChild(inner);
  }

  if (stop.isOrigin || stop.isDestination) {
    dot.style.width = "24px";
    dot.style.height = "24px";
  }

  root.appendChild(dot);

  if (stop.events.length > 1) {
    const badge = document.createElement("span");
    badge.textContent = String(stop.events.length);
    badge.style.cssText =
      "position:absolute;transform:translate(13px,13px);min-width:15px;height:15px;padding:0 3px;border-radius:9999px;background:#F0F2F5;border:1px solid #cbd5e1;color:#0f172a;font-size:9px;font-weight:700;display:flex;align-items:center;justify-content:center;font-family:ui-monospace,monospace;";
    root.appendChild(badge);
  }

  return root;
}

/**
 * Road and rail timelines carry fewer real coordinates than air or ocean, so
 * instead of inventing a highway/railway polyline the map marks each cleared
 * checkpoint and labels it in place.
 */
function createGroundCheckpointElement(stop: TimelineStop): HTMLElement {
  const size = stop.isOrigin || stop.isDestination ? 24 : 20;

  const root = document.createElement("div");
  root.style.cssText = `width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;cursor:pointer;`;

  const base = `width:${size}px;height:${size}px;border-radius:9999px;display:flex;align-items:center;justify-content:center;border:2px solid #ffffff;box-shadow:0 2px 8px rgba(15,23,42,.32);`;

  const dot = document.createElement("div");
  const held = stop.status === "active" && stop.isHoldGate;

  if (stop.status === "completed") {
    dot.style.cssText = `${base}background:#0F313A;`;
    dot.innerHTML = CHECK_SVG;
  } else if (stop.status === "active") {
    dot.style.cssText = `${base}background:${held ? "#B45309" : "#BA1C20"};`;
    if (held) {
      dot.innerHTML = CHECK_SVG;
    } else {
      const inner = document.createElement("span");
      inner.style.cssText =
        "width:7px;height:7px;border-radius:9999px;background:#ffffff;";
      dot.appendChild(inner);
    }
  } else {
    dot.style.cssText = `${base}background:#ffffff;border-color:#94a3b8;`;
    const inner = document.createElement("span");
    inner.style.cssText =
      "width:6px;height:6px;border-radius:9999px;background:#94a3b8;";
    dot.appendChild(inner);
  }

  root.appendChild(dot);

  const prefix =
    stop.status === "completed"
      ? ""
      : held
      ? "Held · "
      : stop.status === "active"
      ? "Current · "
      : "Planned · ";

  const label = document.createElement("span");
  label.textContent = `${prefix}${stop.name}`;
  label.style.cssText = `position:absolute;left:${size / 2 + 7}px;top:50%;transform:translateY(-50%);max-width:190px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;background:${
    stop.status === "upcoming" ? "rgba(255,255,255,.92)" : "#ffffff"
  };border:1px solid ${
    held ? "#F59E0B" : stop.status === "upcoming" ? "#cbd5e1" : "#94a3b8"
  };border-radius:7px;padding:2px 7px;font:700 10px/1.5 ui-sans-serif,system-ui,sans-serif;color:${
    stop.status === "upcoming" ? "#64748b" : "#0f172a"
  };box-shadow:0 2px 6px rgba(15,23,42,.16);`;
  root.appendChild(label);

  return root;
}

function createVehicleElement(mode: TransportMode, paused: boolean): HTMLElement {
  const color = paused ? "#B45309" : "#0F313A";
  const root = document.createElement("div");
  root.style.cssText = "position:relative;width:46px;height:46px;display:flex;align-items:center;justify-content:center;cursor:pointer;";

  const halo = document.createElement("span");
  halo.style.cssText = `position:absolute;inset:0;border-radius:9999px;background:${color}26;border:1px solid ${color}33;`;
  root.appendChild(halo);

  const badge = document.createElement("div");
  badge.style.cssText = `position:relative;z-index:2;width:34px;height:34px;border-radius:9999px;background:${color};border:2px solid #ffffff;display:flex;align-items:center;justify-content:center;color:#ffffff;box-shadow:0 4px 12px rgba(15,23,42,.35);`;
  badge.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" style="display:block;">${MODE_GLYPH[mode] || MODE_GLYPH.ocean}</svg>`;
  root.appendChild(badge);

  return root;
}

interface LegSplit {
  completed: Coordinate[][];
  upcoming: Coordinate[][];
}

function splitLegsAtProgress(
  state: TimelineMapState,
  legs: TimelineLeg[] | null,
  pausedCoordinates?: Coordinate | null
): LegSplit {
  if (!legs || legs.length === 0) {
    return { completed: [], upcoming: [] };
  }

  const reached = Math.min(Math.max(state.reachedStopIndex, 0), legs.length);
  let completedCount = reached;
  let partialLegIndex = -1;

  if (state.isPaused && pausedCoordinates) {
    const arrivalLeg = legs[reached - 1];
    if (arrivalLeg) {
      const projection = projectOntoRoute(
        pausedCoordinates,
        arrivalLeg.coordinates
      );
      // Only split when the hold is genuinely between the previous stop and the
      // active stop. A hold at the stop itself leaves the arrival leg complete.
      if (
        projection.distanceKm <= 250 &&
        projection.fraction > 0.02 &&
        projection.fraction < 0.995
      ) {
        completedCount = reached - 1;
        partialLegIndex = completedCount;
      }
    }
  }

  const completed = legs
    .slice(0, completedCount)
    .map((leg) => leg.coordinates);
  const upcoming = legs
    .slice(completedCount)
    .map((leg) => leg.coordinates);

  if (partialLegIndex >= 0 && pausedCoordinates) {
    const currentLeg = legs[partialLegIndex];
    const projection = projectOntoRoute(
      pausedCoordinates,
      currentLeg.coordinates
    );
    const split = splitLineAtFraction(
      currentLeg.coordinates,
      projection.fraction
    );
    if (split.completed.length >= 2) completed.push(split.completed);
    if (split.upcoming.length >= 2) upcoming[0] = split.upcoming;
  }

  return { completed, upcoming };
}

function toLineFeature(lines: Coordinate[][]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: lines
      .flatMap((line) => splitAtAntimeridian(line))
      .filter((line) => line.length >= 2)
      .map((line) => ({
        type: "Feature" as const,
        properties: {},
        geometry: {
          type: "LineString" as const,
          coordinates: line,
        },
      })),
  };
}

/**
 * Camera bounds for a route that may cross the date line.
 *
 * The longitudes are unwrapped first so the extent follows the path instead
 * of spanning the empty Atlantic between Shanghai and Miami. Shifting the
 * whole extent by a multiple of 360° keeps the resulting centre wrapped
 * while leaving west < east, which `fitBounds` needs.
 */
function timelineFitBounds(points: Coordinate[]): maplibregl.LngLatBounds | null {
  if (points.length === 0) return null;

  const unwrapped = unwrapLongitudes(points);
  let minLon = Infinity;
  let maxLon = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;

  for (const [lon, lat] of unwrapped) {
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }

  if (maxLon - minLon > 350) {
    minLon = -180;
    maxLon = 180;
  } else {
    const shift = -Math.round((minLon + maxLon) / 720) * 360;
    minLon += shift;
    maxLon += shift;
  }

  return new maplibregl.LngLatBounds([minLon, minLat], [maxLon, maxLat]);
}

/**
 * Places a marker on the copy of the world nearest the current camera so
 * stops on the far side of the date line stay visible. MapLibre duplicates
 * tiles for world copies but not DOM markers.
 */
function wrapNear(coordinate: Coordinate, referenceLng: number): Coordinate {
  let lon = coordinate[0];
  while (lon - referenceLng > 180) lon -= 360;
  while (lon - referenceLng < -180) lon += 360;
  return [lon, coordinate[1]];
}

interface PlacedMarker {
  marker: maplibregl.Marker;
  coordinates: Coordinate;
}

export default function TimelineRouteMap({
  mode,
  milestones = [],
  origin,
  destination,
  waypoints = [],
  routeCoordinates = [],
  paused = false,
  pausedCoordinates,
  showVehicle = true,
  preview = false,
  height = "420px",
  className = "",
  vehicleTitle,
  vehicleSubtitle,
  fitPadding = DEFAULT_FIT_PADDING,
  legendClassName = "bottom-9 left-3",
}: TimelineRouteMapProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const mapRef = React.useRef<maplibregl.Map | null>(null);
  const markersRef = React.useRef<PlacedMarker[]>([]);
  const initialCenterRef = React.useRef<Coordinate>(origin.coordinates);
  const didFitRef = React.useRef(false);
  const fitKeyRef = React.useRef("");

  const [mapLoaded, setMapLoaded] = React.useState(false);
  const [errorState, setErrorState] = React.useState<string | null>(null);
  const [now, setNow] = React.useState(() => Date.now());

  React.useEffect(() => {
    if (preview || !showVehicle) return;
    const interval = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(interval);
  }, [preview, showVehicle]);

  const state = React.useMemo(
    () =>
      resolveTimelineMapState({
        milestones,
        origin,
        destination,
        waypoints,
        routeCoordinates,
        paused,
        pausedCoordinates,
        now,
        preview,
      }),
    [
      milestones,
      origin,
      destination,
      waypoints,
      routeCoordinates,
      paused,
      pausedCoordinates,
      now,
      preview,
    ]
  );

  const isGroundMode = mode === "rail" || mode === "road";

  const requestedStops = React.useMemo(
    () =>
      state.stops.map((stop) => ({
        id: stop.id,
        name: stop.name,
        code: stop.code,
        coordinates: stop.coordinates,
      })),
    [state.stops]
  );

  const { legs, loading, error } = useTimelineLegs({
    mode,
    stops: requestedStops,
    routeCoordinates,
    enabled: !isGroundMode,
  });

  const alignedLegs =
    legs &&
    legs.length === state.stops.length - 1 &&
    legs[0]?.fromStopId === state.stops[0]?.id
      ? legs
      : null;

  const legSplit = React.useMemo(
    () => splitLegsAtProgress(state, alignedLegs, pausedCoordinates),
    [state, alignedLegs, pausedCoordinates]
  );

  const markerStops = React.useMemo(
    () =>
      isGroundMode
        ? state.stops.filter((stop) => !stop.inferred)
        : state.stops,
    [isGroundMode, state.stops]
  );

  const fitPoints = React.useMemo(() => {
    if (isGroundMode) {
      const points = markerStops.map((stop) => stop.coordinates);
      if (pausedCoordinates) points.push(pausedCoordinates);
      return points;
    }
    return routeCoordinates.length > 1
      ? routeCoordinates
      : state.stops.map((stop) => stop.coordinates);
  }, [isGroundMode, markerStops, pausedCoordinates, routeCoordinates, state.stops]);

  const fitKey = React.useMemo(
    () =>
      `${state.stops
        .map((stop) => `${stop.coordinates[0]},${stop.coordinates[1]}`)
        .join("|")}|${routeCoordinates.length}|${
        routeCoordinates[0]?.join(",") ?? ""
      }|${routeCoordinates[routeCoordinates.length - 1]?.join(",") ?? ""}`,
    [state.stops, routeCoordinates]
  );

  // Initialize the map once.
  React.useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;

    async function initMap() {
      try {
        const style = await getEnglishMapStyle(DEFAULT_MAP_STYLE_URL);
        if (cancelled || !containerRef.current) return;

        const map = new maplibregl.Map({
          container: containerRef.current,
          style,
          center: initialCenterRef.current,
          zoom: 2,
          minZoom: 1.4,
          maxZoom: 18,
          attributionControl: false,
        });

        map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-left");
        map.addControl(
          new maplibregl.NavigationControl({ showCompass: true, showZoom: true }),
          "bottom-right"
        );

        map.on("load", () => {
          if (cancelled) {
            map.remove();
            return;
          }

          // World copies must stay enabled: a route crossing the date line is
          // drawn across two adjacent world copies, and disabling them would
          // clamp the camera away from the Pacific leg.
          map.setRenderWorldCopies(true);

          map.on("move", () => {
            const centerLng = map.getCenter().lng;
            for (const entry of markersRef.current) {
              entry.marker.setLngLat(
                wrapNear(entry.coordinates, centerLng)
              );
            }
          });

          map.addSource("timeline-upcoming", {
            type: "geojson",
            data: toLineFeature([]),
          });
          map.addLayer({
            id: "timeline-upcoming-casing",
            type: "line",
            source: "timeline-upcoming",
            layout: { "line-cap": "round", "line-join": "round" },
            paint: {
              "line-color": "#ffffff",
              "line-width": 6,
              "line-opacity": 0.85,
            },
          });
          map.addLayer({
            id: "timeline-upcoming-line",
            type: "line",
            source: "timeline-upcoming",
            layout: { "line-cap": "round", "line-join": "round" },
            paint: {
              "line-color": "#94a3b8",
              "line-width": 3.2,
              "line-dasharray": [2.4, 2],
              "line-opacity": 0.95,
            },
          });

          map.addSource("timeline-completed", {
            type: "geojson",
            data: toLineFeature([]),
          });
          map.addLayer({
            id: "timeline-completed-casing",
            type: "line",
            source: "timeline-completed",
            layout: { "line-cap": "round", "line-join": "round" },
            paint: {
              "line-color": "#ffffff",
              "line-width": 8,
              "line-opacity": 0.9,
            },
          });
          map.addLayer({
            id: "timeline-completed-line",
            type: "line",
            source: "timeline-completed",
            layout: { "line-cap": "round", "line-join": "round" },
            paint: {
              "line-color": "#0F313A",
              "line-width": 4.6,
            },
          });

          mapRef.current = map;
          setMapLoaded(true);
        });

        const observer = new ResizeObserver(() => map.resize());
        observer.observe(containerRef.current);

        map.on("remove", () => observer.disconnect());
      } catch (err) {
        console.error("Failed to initialize TimelineRouteMap:", err);
        if (!cancelled) setErrorState("Could not load the map tiles.");
      }
    }

    initMap();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update split route geometry.
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const upcomingSource = map.getSource("timeline-upcoming") as
      | maplibregl.GeoJSONSource
      | undefined;
    const completedSource = map.getSource("timeline-completed") as
      | maplibregl.GeoJSONSource
      | undefined;

    // Road and rail use checkpoint markers instead of an invented path.
    if (isGroundMode) {
      upcomingSource?.setData(toLineFeature([]));
      completedSource?.setData(toLineFeature([]));
      return;
    }

    if (upcomingSource) {
      const upcomingLines =
        legSplit.upcoming.length > 0
          ? legSplit.upcoming
          : !alignedLegs && routeCoordinates.length > 1
          ? [routeCoordinates]
          : [];
      upcomingSource.setData(toLineFeature(upcomingLines));
    }
    if (completedSource) {
      completedSource.setData(toLineFeature(legSplit.completed));
    }
  }, [
    legSplit,
    alignedLegs,
    routeCoordinates,
    mapLoaded,
    isGroundMode,
  ]);

  // Fit once to the timeline extent, and again if the stop geometry changes.
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    if (didFitRef.current && fitKeyRef.current === fitKey) return;

    const bounds = timelineFitBounds(fitPoints);
    if (!bounds) return;

    const isFirstFit = !didFitRef.current;
    didFitRef.current = true;
    fitKeyRef.current = fitKey;
    map.fitBounds(bounds, {
      // Ground checkpoints carry labels that extend to the right of the dot,
      // and the bottom-left legend overlaps the map, so reserve room for both.
      padding: isGroundMode
        ? {
            ...fitPadding,
            top: fitPadding.top + 16,
            right: fitPadding.right + 170,
            bottom: fitPadding.bottom + 72,
          }
        : fitPadding,
      maxZoom: 12,
      duration: isFirstFit ? 0 : 700,
    });
  }, [fitKey, fitPoints, mapLoaded, fitPadding, isGroundMode]);

  // Rebuild markers from the current timeline state.
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    markersRef.current.forEach((entry) => entry.marker.remove());
    markersRef.current = [];

    const centerLng = map.getCenter().lng;

    markerStops.forEach((stop) => {
      const popup = new maplibregl.Popup({ offset: 16, closeButton: true, maxWidth: "280px" }).setDOMContent(
        createStopPopup(stop)
      );
      const marker = new maplibregl.Marker({
        element: isGroundMode
          ? createGroundCheckpointElement(stop)
          : createStopElement(stop),
        anchor: "center",
      })
        .setLngLat(wrapNear(stop.coordinates, centerLng))
        .setPopup(popup)
        .addTo(map);
      markersRef.current.push({ marker, coordinates: stop.coordinates });
    });

    if (showVehicle) {
      const activeStop =
        state.activeStopIndex >= 0 ? state.stops[state.activeStopIndex] : null;
      // With the new pause semantics the gate itself is completed, so anchor
      // the hold copy on the last cleared hold gate rather than the next stop.
      const clearedGateStop = state.isPaused
        ? [...state.stops]
            .reverse()
            .find((stop) =>
              stop.events.some((event) => event.isCompleted && event.isHoldGate)
            ) || null
        : null;
      const holdStop = clearedGateStop || activeStop;
      const etaLine = state.isPaused
        ? `Holding at ${holdStop?.name || "the current checkpoint"} until the hold is released.`
        : activeStop
        ? `Next: ${activeStop.events.find((event) => !event.isCompleted)?.title || activeStop.name}`
        : state.isDelivered
        ? "All timeline checkpoints cleared."
        : "Awaiting departure.";

      const popupRoot = document.createElement("div");
      popupRoot.style.fontFamily = "ui-sans-serif, system-ui, sans-serif";
      popupRoot.style.maxWidth = "230px";

      const eyebrow = document.createElement("span");
      eyebrow.textContent = state.isPaused
        ? "HOLD / PAUSED"
        : state.isDelivered
        ? "DELIVERED"
        : `${MODE_LABEL[mode]} · IN TRANSIT`;
      eyebrow.style.cssText = `display:block;font-size:9px;font-weight:800;letter-spacing:.08em;color:${
        state.isPaused ? "#B45309" : "#0F313A"
      };`;
      popupRoot.appendChild(eyebrow);

      const title = document.createElement("p");
      title.textContent =
        vehicleTitle ||
        (state.isPaused ? "Shipment on hold" : state.isDelivered ? "Shipment delivered" : "Shipment in transit");
      title.style.cssText = "margin:3px 0 0;font-size:13px;font-weight:800;color:#0f172a;";
      popupRoot.appendChild(title);

      if (vehicleSubtitle) {
        const subtitle = document.createElement("p");
        subtitle.textContent = vehicleSubtitle;
        subtitle.style.cssText = "margin:1px 0 0;font-size:10px;color:#64748b;font-family:ui-monospace,monospace;";
        popupRoot.appendChild(subtitle);
      }

      const progress = document.createElement("p");
      progress.textContent = `Timeline ${state.completedEvents}/${state.totalEvents} checkpoints · ${state.progressPercentage}%`;
      progress.style.cssText = "margin:5px 0 0;font-size:10px;color:#334155;font-weight:600;";
      popupRoot.appendChild(progress);

      const next = document.createElement("p");
      next.textContent = etaLine;
      next.style.cssText = "margin:2px 0 0;font-size:10px;line-height:1.35;color:#64748b;";
      popupRoot.appendChild(next);

      const vehiclePopup = new maplibregl.Popup({
        offset: 24,
        closeButton: false,
        maxWidth: "250px",
      }).setDOMContent(popupRoot);

      const vehicleMarker = new maplibregl.Marker({
        element: createVehicleElement(mode, state.isPaused && !state.isDelivered),
        anchor: "center",
        offset: isGroundMode ? [0, -40] : [0, 0],
      })
        .setLngLat(wrapNear(state.vehicleCoordinate, centerLng))
        .setPopup(vehiclePopup)
        .addTo(map);
      markersRef.current.push({
        marker: vehicleMarker,
        coordinates: state.vehicleCoordinate,
      });
    }
  }, [
    state,
    markerStops,
    isGroundMode,
    mapLoaded,
    mode,
    showVehicle,
    vehicleTitle,
    vehicleSubtitle,
  ]);

  return (
    <div
      ref={containerRef}
      style={{ height, width: "100%" }}
      className={`relative overflow-hidden bg-slate-100 dark:bg-slate-900 ${className}`}
    >
      {mapLoaded && (
        <>
          <div className="pointer-events-none absolute left-3 top-3 z-10 rounded-xl bg-white/92 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#0F313A] shadow-sm backdrop-blur dark:bg-slate-900/90 dark:text-white">
            {MODE_LABEL[mode]} · {isGroundMode ? "Timeline Checkpoints" : "Timeline Route"}
          </div>

          <div
            className={`pointer-events-none absolute z-10 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-white/92 px-3 py-1.5 text-[10px] font-medium text-slate-600 shadow-sm backdrop-blur dark:bg-slate-900/90 dark:text-slate-300 ${legendClassName}`}
          >
            {isGroundMode ? (
              <>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#0F313A]" />
                  Cleared
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-2.5 rounded-full border border-slate-400 bg-white" />
                  Planned
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#BA1C20]" />
                  Current
                </span>
              </>
            ) : (
              <>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-[3px] w-5 rounded-full bg-[#0F313A]" />
                  Travelled
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-0 w-5 border-t-2 border-dashed border-slate-400" />
                  Planned
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2 w-2 rounded-full bg-[#BA1C20]" />
                  Current
                </span>
              </>
            )}
          </div>

          {loading && (
            <div className="pointer-events-none absolute right-3 top-16 z-10 flex items-center gap-2 rounded-xl bg-white/92 px-3 py-1.5 text-[10px] font-semibold text-slate-600 shadow-sm backdrop-blur dark:bg-slate-900/90 dark:text-slate-300">
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-[#0F313A] border-t-transparent" />
              Mapping checkpoint legs
            </div>
          )}

          {error && !loading && (
            <div className="pointer-events-none absolute right-3 top-16 z-10 max-w-[220px] rounded-xl bg-amber-50/95 px-3 py-1.5 text-[10px] font-medium text-amber-800 shadow-sm backdrop-blur dark:bg-amber-950/80 dark:text-amber-200">
              Live router unavailable — showing direct leg geometry.
            </div>
          )}
        </>
      )}

      {!mapLoaded && !errorState && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-slate-900 text-slate-400">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-[#BA1C20] border-t-transparent" />
          <p className="text-xs font-mono text-slate-300">Mapping timeline checkpoints...</p>
        </div>
      )}

      {errorState && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-slate-900 p-6 text-center text-slate-400">
          <p className="text-xs font-semibold text-rose-400">{errorState}</p>
          <p className="text-[11px] text-slate-400">
            The timeline is still available below the map.
          </p>
        </div>
      )}
    </div>
  );
}
