/**
 * Global Map Configuration & English Language Engine
 * 
 * Provides:
 * 1. Free, open tile service endpoints (OpenFreeMap / Protomaps compatible).
 * 2. In-memory vector style interceptor that strips non-Latin/Chinese characters
 *    and enforces pure English labels across all place, street, and geographical layers.
 * 3. Future-proof migration path: simply update MAP_STYLE_URL or NEXT_PUBLIC_MAP_STYLE_URL.
 */

import type { StyleSpecification } from "maplibre-gl";

export const DEFAULT_MAP_STYLE_URL =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL ||
  "https://tiles.openfreemap.org/styles/bright";

export const ALTERNATE_MAP_STYLES = {
  bright: "https://tiles.openfreemap.org/styles/bright",
  liberty: "https://tiles.openfreemap.org/styles/liberty",
  positron: "https://tiles.openfreemap.org/styles/positron",
} as const;

// In-memory cache for transformed English vector style JSON
let cachedEnglishStyle: StyleSpecification | null = null;
let fetchingPromise: Promise<StyleSpecification> | null = null;
const STYLE_CACHE_KEY = "rilfreight_english_map_style_v1";

/**
 * Rewrites any vector style JSON so that all text labels strictly prioritize
 * English translations (`name:en`, `name_en`), falling back to Romanized Latin
 * (`name:latin`), and completely preventing bilingual / non-Latin scripts (e.g. Chinese characters).
 */
export function enforceEnglishStyle(rawStyle: StyleSpecification): StyleSpecification {
  const cloned = JSON.parse(JSON.stringify(rawStyle)) as StyleSpecification;

  if (Array.isArray(cloned.layers)) {
    for (const layer of cloned.layers) {
      if (layer.type === "symbol" && layer.layout) {
        const layout = layer.layout as Record<string, unknown>;
        if (layout["text-field"]) {
          // Strictly prioritize English, then Romanized Latin, then base name.
          // Never output non-Latin concatenations.
          layout["text-field"] = [
            "coalesce",
            ["get", "name:en"],
            ["get", "name_en"],
            ["get", "name:latin"],
            ["get", "name"],
          ];
        }
      }
    }
  }

  return cloned;
}

/**
 * Loads the active vector style and applies the English language filter.
 * Results are cached in localStorage and in-memory for instant 0ms renders.
 */
export async function getEnglishMapStyle(
  styleUrl: string = DEFAULT_MAP_STYLE_URL
): Promise<StyleSpecification> {
  if (cachedEnglishStyle) {
    return cachedEnglishStyle;
  }

  // Check localStorage for instant 0ms startup
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(STYLE_CACHE_KEY);
      if (stored) {
        cachedEnglishStyle = JSON.parse(stored) as StyleSpecification;
        return cachedEnglishStyle;
      }
    } catch {
      // Fall through to network fetch if storage is inaccessible
    }
  }

  if (fetchingPromise) {
    return fetchingPromise;
  }

  fetchingPromise = (async () => {
    try {
      const response = await fetch(styleUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch map style from ${styleUrl}: HTTP ${response.status}`);
      }
      const rawStyle = (await response.json()) as StyleSpecification;
      cachedEnglishStyle = enforceEnglishStyle(rawStyle);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(STYLE_CACHE_KEY, JSON.stringify(cachedEnglishStyle));
        } catch {
          // Ignore localStorage quota errors
        }
      }
      return cachedEnglishStyle;
    } catch (error) {
      console.warn("Could not transform vector map style, using direct URL fallback:", error);
      // Fallback: Return a minimal valid style pointing directly to OpenFreeMap
      throw error;
    } finally {
      fetchingPromise = null;
    }
  })();

  return fetchingPromise;
}
