"use client";

import * as React from "react";
import type { TransportMode } from "@/shared/types";
import type { Coordinate } from "@/features/tracking/lib/geo";
import { buildFallbackLegs } from "@/features/tracking/lib/fallbackLegs";
import type {
  TimelineLeg,
  TimelineLegStop,
  TimelineLegsPayload,
} from "@/shared/types/timeline";

const LEG_CACHE = new Map<string, TimelineLeg[]>();
const MAX_CACHE_ENTRIES = 40;

function cacheLegs(key: string, legs: TimelineLeg[]) {
  if (LEG_CACHE.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = LEG_CACHE.keys().next().value;
    if (oldestKey !== undefined) LEG_CACHE.delete(oldestKey);
  }
  LEG_CACHE.set(key, legs);
}

function routeSignature(route?: Coordinate[]): string {
  if (!route || route.length < 2) return "none";
  const first = route[0];
  const last = route[route.length - 1];
  return `${route.length}:${first[0]},${first[1]}:${last[0]},${last[1]}`;
}

export interface UseTimelineLegsInput {
  mode: TransportMode;
  stops: TimelineLegStop[];
  routeCoordinates?: Coordinate[];
  enabled?: boolean;
}

export interface UseTimelineLegsResult {
  legs: TimelineLeg[] | null;
  loading: boolean;
  error: string | null;
}

export function useTimelineLegs({
  mode,
  stops,
  routeCoordinates,
  enabled = true,
}: UseTimelineLegsInput): UseTimelineLegsResult {
  const stopsKey = stops
    .map((stop) => `${stop.id}:${stop.coordinates[0]},${stop.coordinates[1]}`)
    .join("|");
  const requestKey = `${enabled ? "on" : "off"}|${mode}|${stopsKey}|${routeSignature(
    routeCoordinates
  )}`;

  const request = React.useMemo<TimelineLegsPayload | null>(() => {
    if (!enabled || stops.length < 2) return null;
    return {
      mode,
      stops: stops.map((stop) => ({
        id: stop.id,
        name: stop.name,
        code: stop.code,
        coordinates: stop.coordinates,
      })),
      routeCoordinates:
        routeCoordinates && routeCoordinates.length > 1
          ? routeCoordinates
          : undefined,
    };
    // requestKey encodes mode, stop geometry and route fingerprint; the raw
    // arrays may be recreated on every render without changing the request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey]);

  const [entry, setEntry] = React.useState<{
    key: string;
    legs: TimelineLeg[];
  } | null>(null);
  const [pendingKey, setPendingKey] = React.useState<string | null>(null);
  const [failure, setFailure] = React.useState<{
    key: string;
    message: string;
  } | null>(null);

  const legs =
    entry?.key === requestKey ? entry.legs : LEG_CACHE.get(requestKey) || null;
  const loading = Boolean(request) && pendingKey === requestKey;
  const error = failure?.key === requestKey ? failure.message : null;

  React.useEffect(() => {
    if (!request) return;
    if (LEG_CACHE.has(requestKey)) return;

    const controller = new AbortController();
    let disposed = false;

    const timer = window.setTimeout(async () => {
      setPendingKey(requestKey);
      try {
        const response = await fetch("/api/route/timeline", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(request),
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok || !Array.isArray(data?.legs)) {
          throw new Error(data?.error || "Timeline route request failed.");
        }
        if (disposed) return;
        cacheLegs(requestKey, data.legs);
        setEntry({ key: requestKey, legs: data.legs });
      } catch (fetchError) {
        if (disposed || controller.signal.aborted) return;
        setFailure({
          key: requestKey,
          message:
            fetchError instanceof Error
              ? fetchError.message
              : "Timeline route request failed.",
        });
        setEntry({ key: requestKey, legs: buildFallbackLegs(request) });
      } finally {
        if (!disposed) {
          setPendingKey((current) => (current === requestKey ? null : current));
        }
      }
    }, 220);

    return () => {
      disposed = true;
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [request, requestKey]);

  return { legs, loading, error };
}
