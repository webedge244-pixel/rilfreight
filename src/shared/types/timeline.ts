export type TimelineCoordinate = [number, number];

export type TimelineLegSource =
  | "timeline"
  | "ocean"
  | "air"
  | "rail"
  | "road"
  | "direct";

export interface TimelineLegStop {
  id: string;
  name: string;
  code?: string;
  coordinates: TimelineCoordinate;
}

export interface TimelineLeg {
  fromStopId: string;
  toStopId: string;
  coordinates: TimelineCoordinate[];
  distanceKm: number;
  distanceNm: number;
  durationHours: number;
  source: TimelineLegSource;
}

export interface TimelineLegsPayload {
  mode: "ocean" | "air" | "rail" | "road";
  stops: TimelineLegStop[];
  routeCoordinates?: TimelineCoordinate[];
}

export interface TimelineLegsResult {
  success: true;
  mode: TimelineLegsPayload["mode"];
  legs: TimelineLeg[];
  totalDistanceKm: number;
  totalDistanceNm: number;
  totalDurationHours: number;
}
