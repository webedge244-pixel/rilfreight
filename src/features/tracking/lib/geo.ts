/**
 * Pure geodesic helpers shared by the timeline route builder (server) and the
 * map renderer (client). Coordinates are always [longitude, latitude].
 */

export type Coordinate = [number, number];

const EARTH_RADIUS_KM = 6371.0;
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

export function isValidCoordinate(
  value: unknown
): value is Coordinate {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    Number.isFinite(value[0]) &&
    Number.isFinite(value[1]) &&
    value[0] >= -180 &&
    value[0] <= 180 &&
    value[1] >= -90 &&
    value[1] <= 90
  );
}

export function coordinatesEqual(
  a: Coordinate,
  b: Coordinate,
  epsilonDeg = 0.005
): boolean {
  return Math.abs(a[0] - b[0]) <= epsilonDeg && Math.abs(a[1] - b[1]) <= epsilonDeg;
}

export function haversineKm(a: Coordinate, b: Coordinate): number {
  const [lon1, lat1] = a;
  const [lon2, lat2] = b;
  if (lon1 === lon2 && lat1 === lat2) return 0;

  const dLat = (lat2 - lat1) * DEG_TO_RAD;
  const dLon = (lon2 - lon1) * DEG_TO_RAD;
  const lat1Rad = lat1 * DEG_TO_RAD;
  const lat2Rad = lat2 * DEG_TO_RAD;

  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
}

export function haversinePathKm(line: Coordinate[]): number {
  let total = 0;
  for (let i = 0; i < line.length - 1; i++) {
    total += haversineKm(line[i], line[i + 1]);
  }
  return total;
}

export function interpolateLinear(
  a: Coordinate,
  b: Coordinate,
  t: number
): Coordinate {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

/**
 * Great-circle interpolation (slerp on the unit sphere) producing `steps`
 * segments, i.e. `steps + 1` coordinates including both endpoints.
 */
export function interpolateGreatCircle(
  a: Coordinate,
  b: Coordinate,
  steps: number
): Coordinate[] {
  const safeSteps = Math.max(1, steps);
  const toVector = ([lon, lat]: Coordinate) => {
    const lonRad = lon * DEG_TO_RAD;
    const latRad = lat * DEG_TO_RAD;
    return [
      Math.cos(latRad) * Math.cos(lonRad),
      Math.cos(latRad) * Math.sin(lonRad),
      Math.sin(latRad),
    ] as const;
  };

  const [x1, y1, z1] = toVector(a);
  const [x2, y2, z2] = toVector(b);
  const dot = Math.min(1, Math.max(-1, x1 * x2 + y1 * y2 + z1 * z2));
  const angle = Math.acos(dot);

  if (Math.abs(angle) < 1e-9) {
    return [a, b];
  }

  const sinAngle = Math.sin(angle);
  const points: Coordinate[] = [];

  for (let i = 0; i <= safeSteps; i++) {
    const t = i / safeSteps;
    const wa = Math.sin((1 - t) * angle) / sinAngle;
    const wb = Math.sin(t * angle) / sinAngle;
    const x = wa * x1 + wb * x2;
    const y = wa * y1 + wb * y2;
    const z = wa * z1 + wb * z2;
    const lat = Math.atan2(z, Math.sqrt(Math.max(0, x * x + y * y))) * RAD_TO_DEG;
    const lon = Math.atan2(y, x) * RAD_TO_DEG;
    points.push([lon, lat]);
  }

  return points;
}

function projectPointOnSegment(
  point: Coordinate,
  start: Coordinate,
  end: Coordinate
): { t: number; distanceKm: number; coordinate: Coordinate } {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const lengthSq = dx * dx + dy * dy;

  let t = 0;
  if (lengthSq > 0) {
    t = ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / lengthSq;
    t = Math.min(1, Math.max(0, t));
  }

  const coordinate: Coordinate = [
    start[0] + dx * t,
    start[1] + dy * t,
  ];

  return { t, distanceKm: haversineKm(point, coordinate), coordinate };
}

/**
 * Projects a coordinate onto a polyline, returning its fractional position
 * (0..1 across the whole line) and how far the point sits off the line.
 */
export function projectOntoRoute(
  coordinate: Coordinate,
  route: Coordinate[]
): { fraction: number; distanceKm: number; coordinate: Coordinate } {
  if (route.length === 0) {
    return { fraction: 0, distanceKm: Infinity, coordinate };
  }
  if (route.length === 1) {
    return {
      fraction: 0,
      distanceKm: haversineKm(coordinate, route[0]),
      coordinate: route[0],
    };
  }

  let best: { t: number; distanceKm: number; coordinate: Coordinate } | null = null;
  let bestSegment = 0;

  for (let i = 0; i < route.length - 1; i++) {
    const projected = projectPointOnSegment(coordinate, route[i], route[i + 1]);
    if (!best || projected.distanceKm < best.distanceKm) {
      best = projected;
      bestSegment = i;
    }
  }

  const projected = best as { t: number; distanceKm: number; coordinate: Coordinate };
  const fraction = (bestSegment + projected.t) / (route.length - 1);

  return {
    fraction: Math.min(1, Math.max(0, fraction)),
    distanceKm: projected.distanceKm,
    coordinate: projected.coordinate,
  };
}

export function sampleRouteAtFraction(
  route: Coordinate[],
  fraction: number
): Coordinate {
  if (route.length === 0) return [0, 0];
  if (route.length === 1) return route[0];

  const clamped = Math.min(1, Math.max(0, fraction));
  const total = route.length - 1;
  const position = clamped * total;
  const index = Math.floor(position);
  const t = position - index;

  if (index >= route.length - 1) return route[route.length - 1];

  return interpolateLinear(route[index], route[index + 1], t);
}

/**
 * Extracts the section of a polyline between two fractional positions,
 * with interpolated endpoints. Returns [] when the section is degenerate.
 */
export function sliceRouteBetweenFractions(
  route: Coordinate[],
  startFraction: number,
  endFraction: number
): Coordinate[] {
  if (route.length < 2) return [...route];

  const start = Math.min(1, Math.max(0, startFraction));
  const end = Math.min(1, Math.max(0, endFraction));
  if (end - start <= 1e-6) return [];

  const total = route.length - 1;
  const startPosition = start * total;
  const endPosition = end * total;
  const startIndex = Math.floor(startPosition);
  const endIndex = Math.floor(endPosition);
  const startT = startPosition - startIndex;
  const endT = endPosition - endIndex;

  const output: Coordinate[] = [
    interpolateLinear(
      route[startIndex],
      route[Math.min(startIndex + 1, route.length - 1)],
      startT
    ),
  ];

  for (let i = startIndex + 1; i <= endIndex; i++) {
    output.push(route[i]);
  }

  if (endT > 1e-6) {
    output.push(
      interpolateLinear(
        route[endIndex],
        route[Math.min(endIndex + 1, route.length - 1)],
        endT
      )
    );
  }

  return dedupeCoordinates(output);
}

export function dedupeCoordinates(
  coordinates: Coordinate[],
  epsilonDeg = 1e-6
): Coordinate[] {
  const output: Coordinate[] = [];
  for (const coordinate of coordinates) {
    if (!isValidCoordinate(coordinate)) continue;
    const previous = output[output.length - 1];
    if (previous && coordinatesEqual(previous, coordinate, epsilonDeg)) continue;
    output.push(coordinate);
  }
  return output;
}

/**
 * Re-expresses longitudes so consecutive points never jump more than 180°.
 * A route that crosses the date line comes back as a continuous sequence
 * (e.g. 170 → 180 → 190) instead of 170 → -180 → -170.
 */
export function unwrapLongitudes(line: Coordinate[]): Coordinate[] {
  if (line.length === 0) return [];
  const output: Coordinate[] = [[line[0][0], line[0][1]]];

  for (let i = 1; i < line.length; i++) {
    let lon = line[i][0];
    const previousLon = output[i - 1][0];
    while (lon - previousLon > 180) lon -= 360;
    while (lon - previousLon < -180) lon += 360;
    output.push([lon, line[i][1]]);
  }

  return output;
}

/**
 * Splits a polyline into pieces that each fit inside one [-180, 180] world
 * window, inserting the crossing point at the antimeridian.
 *
 * MapLibre draws a segment that jumps from 179 to -179 the long way across
 * the map, so a route that crosses the date line has to be handed to it as
 * separate LineStrings.
 */
export function splitAtAntimeridian(line: Coordinate[]): Coordinate[][] {
  if (line.length < 2) return line.length === 1 ? [[...line]] : [];

  const unwrapped = unwrapLongitudes(line);
  const chunks: Coordinate[][] = [];
  let current: Coordinate[] = [unwrapped[0]];

  for (let i = 1; i < unwrapped.length; i++) {
    const previous = unwrapped[i - 1];
    const point = unwrapped[i];
    const previousBand = Math.floor((previous[0] + 180) / 360);
    const pointBand = Math.floor((point[0] + 180) / 360);

    if (previousBand === pointBand) {
      current.push(point);
      continue;
    }

    const direction = point[0] > previous[0] ? 1 : -1;
    const boundary =
      direction > 0 ? previousBand * 360 + 180 : previousBand * 360 - 180;
    const denominator = point[0] - previous[0];
    const ratio = denominator === 0 ? 0 : (boundary - previous[0]) / denominator;
    const edge: Coordinate = [
      boundary,
      previous[1] + (point[1] - previous[1]) * ratio,
    ];

    current.push(edge);
    chunks.push(current);
    current = [edge, point];
  }
  chunks.push(current);

  return chunks
    .map((chunk) => {
      const midLon =
        chunk.reduce((sum, coordinate) => sum + coordinate[0], 0) / chunk.length;
      const shift = -Math.round(midLon / 360) * 360;
      return dedupeCoordinates(
        chunk.map(([lon, lat]) => [lon + shift, lat] as Coordinate)
      );
    })
    .filter((chunk) => chunk.length >= 2);
}

/**
 * Interpolates a point at the given distance fraction along a polyline.
 */
export function interpolateAlongLine(
  line: Coordinate[],
  fraction: number
): Coordinate {
  if (line.length === 0) return [0, 0];
  if (line.length === 1) return line[0];

  const clamped = Math.min(1, Math.max(0, fraction));
  const cumulative: number[] = [0];
  for (let i = 0; i < line.length - 1; i++) {
    cumulative.push(cumulative[i] + haversineKm(line[i], line[i + 1]));
  }

  const total = cumulative[cumulative.length - 1];
  if (total <= 0) return line[0];

  const target = total * clamped;
  for (let i = 0; i < cumulative.length - 1; i++) {
    if (target <= cumulative[i + 1]) {
      const segmentLength = cumulative[i + 1] - cumulative[i];
      const t = segmentLength > 0 ? (target - cumulative[i]) / segmentLength : 0;
      return interpolateLinear(line[i], line[i + 1], t);
    }
  }

  return line[line.length - 1];
}

/**
 * Splits a polyline at a distance fraction, sharing the split coordinate so
 * completed and upcoming sections join without a visual gap.
 */
export function splitLineAtFraction(
  line: Coordinate[],
  fraction: number
): { completed: Coordinate[]; upcoming: Coordinate[] } {
  if (line.length < 2) {
    return { completed: [...line], upcoming: [...line] };
  }

  const clamped = Math.min(1, Math.max(0, fraction));
  if (clamped <= 0) return { completed: [], upcoming: [...line] };
  if (clamped >= 1) return { completed: [...line], upcoming: [] };

  const cumulative: number[] = [0];
  for (let i = 0; i < line.length - 1; i++) {
    cumulative.push(cumulative[i] + haversineKm(line[i], line[i + 1]));
  }
  const total = cumulative[cumulative.length - 1];
  if (total <= 0) return { completed: [line[0]], upcoming: [line[0]] };

  const target = total * clamped;

  for (let i = 0; i < line.length - 1; i++) {
    if (target <= cumulative[i + 1]) {
      const segmentLength = cumulative[i + 1] - cumulative[i];
      const t = segmentLength > 0 ? (target - cumulative[i]) / segmentLength : 0;
      const splitPoint = interpolateLinear(line[i], line[i + 1], t);

      return {
        completed: dedupeCoordinates([...line.slice(0, i + 1), splitPoint]),
        upcoming: dedupeCoordinates([splitPoint, ...line.slice(i + 1)]),
      };
    }
  }

  return { completed: [...line], upcoming: [] };
}
