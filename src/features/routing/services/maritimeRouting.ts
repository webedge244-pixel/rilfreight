import { seaRoute } from "searoute-ts";

/**
 * Calculates a maritime shipping route between origin and destination coordinates.
 * Returns an array of [longitude, latitude] coordinates avoiding landmasses.
 *
 * @param origin - [longitude, latitude]
 * @param destination - [longitude, latitude]
 */
export function calculateMaritimeRoute(
  origin: [number, number],
  destination: [number, number]
): [number, number][] {
  try {
    const result = seaRoute(origin, destination);
    if (result?.geometry?.coordinates && Array.isArray(result.geometry.coordinates)) {
      return result.geometry.coordinates.map(
        (coord) => [coord[0], coord[1]] as [number, number]
      );
    }
    return [origin, destination];
  } catch (error) {
    console.error("Maritime routing calculation error:", error);
    return [origin, destination];
  }
}
