/**
 * Core transport modes supported by the platform.
 */
export type TransportMode = "ocean" | "air" | "rail" | "road";

/**
 * Standardized shipment status states.
 */
export type ShipmentStatus =
  | "draft"
  | "pending"
  | "in_transit"
  | "customs_hold"
  | "weather_delay"
  | "docked"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

/**
 * Location facility classifications.
 */
export type LocationType = "seaport" | "airport" | "rail_terminal" | "road_hub";

/**
 * Authoritative logistics location record.
 */
export interface LocationData {
  code: string; // UN/LOCODE (e.g. "HKHKG", "USMIA") or IATA (e.g. "HKG", "MIA")
  name: string;
  city: string;
  country: string;
  countryCode: string; // ISO 2-letter alpha-2
  coordinates: [number, number]; // [longitude, latitude]
  type: LocationType;
  tier?: number;
}

/**
 * Single geographic waypoint along a travel route.
 */
export interface RouteWaypoint {
  id: string;
  name: string;
  code?: string; // e.g. UN/LOCODE "CNSHA" or IATA "PVG"
  country: string;
  coordinates: [number, number]; // [longitude, latitude]
  estimatedArrival?: string;
  estimatedDeparture?: string;
  actualArrival?: string;
  actualDeparture?: string;
  isCompleted: boolean;
  notes?: string;
}

/**
 * Chronological milestone event for public tracking timeline.
 */
export interface TrackingMilestone {
  id: string;
  code: string; // e.g. "GTIN", "LOAD", "DEPA", "RCS", "DEP", "ARR"
  title: string;
  description: string;
  locationName: string;
  locationCode?: string;
  timestamp: string; // ISO 8601 string
  isCompleted: boolean;
  coordinates?: [number, number];
  dwellHours?: number; // Operational turnaround / dwell time in hours
  isHoldGate?: boolean; // Pause gate flag (customs hold for international shipments)
  status?: string;
}

/**
 * Logistics default parameters generated for conveyances and equipment.
 */
export interface LogisticsDefaults {
  conveyanceName: string;
  conveyanceIdentifier?: string;
  vesselName?: string;
  imoNumber?: string;
  voyageCode?: string;
  containerNumber?: string;
  sealNumber?: string;
  flightNumber?: string;
  aircraftType?: string;
  trainId?: string;
  locomotiveNumber?: string;
  truckPlate?: string;
  driverName?: string;
  trailerNumber?: string;
}

/**
 * Request payload for the real-time route calculation engine.
 */
export interface RouteCalculationRequest {
  mode: TransportMode;
  origin: {
    code?: string;
    name: string;
    city?: string;
    country: string;
    coordinates: [number, number]; // [longitude, latitude]
  };
  destination: {
    code?: string;
    name: string;
    city?: string;
    country: string;
    coordinates: [number, number]; // [longitude, latitude]
  };
  departureDate: string; // ISO string
  estimatedDeliveryDate: string; // ISO string
  waypoints?: RouteWaypoint[];
}

/**
 * Response payload produced by the real-time route calculation engine.
 */
export interface RouteCalculationResponse {
  success: boolean;
  mode: TransportMode;
  distanceKm: number;
  distanceNm: number;
  durationHours?: number;
  coordinates: [number, number][]; // [longitude, latitude]
  waypoints: RouteWaypoint[];
  milestones: TrackingMilestone[];
  carrierTrackingCode: string;
  trackingNumber: string;
  logisticsDefaults: LogisticsDefaults;
  passages?: string[]; // e.g. ['panama', 'suez']
}

/**
 * Complete Shipment Entity Model.
 */
export interface Shipment {
  id: string;
  trackingCode: string; // e.g. "RIL-8492-3019-US"
  mode: TransportMode;
  status: ShipmentStatus;
  
  // Origin & Destination
  originName: string;
  originCode: string; // e.g. "CNSHA" or "PVG"
  originCountry: string;
  originCoordinates: [number, number]; // [lon, lat]

  destinationName: string;
  destinationCode: string;
  destinationCountry: string;
  destinationCoordinates: [number, number];

  // Schedule timestamps
  departureDate: string; // ISO string
  estimatedDeliveryDate: string;
  actualDeliveryDate?: string;

  // Real-time tracking control state
  isPaused: boolean;
  pausedAtTimestamp?: string;
  pausedLocationName?: string;
  pausedCoordinates?: [number, number];
  pausedReason?: string;

  // Cargo Specifications
  conveyanceName: string; // Vessel name, Flight No, or Train ID
  conveyanceIdentifier?: string; // IMO number, Aircraft reg, Wagon ID
  voyageNumber?: string;
  consignmentReference: string; // Bill of Lading, AWB, or CIM number
  containerNumber?: string;
  sealNumber?: string;
  totalPieces: number;
  grossWeightKg: number;
  volumeCbm?: number;
  goodsDescription: string;
  clientName?: string; // Client / Consignee Name

  // Geometry and Timeline
  routeCoordinates: [number, number][]; // Array of [lon, lat] points
  waypoints: RouteWaypoint[];
  milestones: TrackingMilestone[];

  // Metadata
  createdAt: string;
  updatedAt: string;
}
