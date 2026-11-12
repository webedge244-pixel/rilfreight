import type { Shipment, TrackingMilestone, RouteWaypoint } from "@/shared/types";

export interface LiveTrackingState {
  shipment: Shipment | null;
  isLoading: boolean;
  error: string | null;
  currentCoordinates: [number, number] | null;
  progressPercentage: number;
  activeMilestone: TrackingMilestone | null;
  upcomingWaypoints: RouteWaypoint[];
  completedWaypoints: RouteWaypoint[];
}
