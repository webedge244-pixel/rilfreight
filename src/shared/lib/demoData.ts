/**
 * Centralized demo data for the admin console.
 *
 * ─────────────────────────────────────────────────────────
 * SWAP INSTRUCTIONS:
 * When Firebase is ready, delete this file and replace all
 * imports of `demoData` with your Firestore fetch functions.
 * Every page imports from this single file, so one swap
 * covers the entire admin.
 * ─────────────────────────────────────────────────────────
 */

import type { Shipment } from "@/shared/types";
import type {
  PlatformUser,
  DashboardKPIs,
  MonthlyVolume,
  EmailTemplate,
  PlatformSettings,
  AdminNavLink,
} from "@/features/admin/types";

// ──────────────────────────────────────────────
// Navigation
// ──────────────────────────────────────────────

export const ADMIN_NAV_LINKS: AdminNavLink[] = [
  { label: "DASHBOARD", href: "/admin/dashboard" },
  { label: "SHIPMENTS", href: "/admin/shipments" },
  { label: "NEW SHIPMENT", href: "/admin/shipments/new" },
  { label: "USERS", href: "/admin/users" },
  { label: "SEND EMAIL", href: "/admin/email" },
];

// ──────────────────────────────────────────────
// Dashboard KPIs
// ──────────────────────────────────────────────

export const DEMO_DASHBOARD_KPIS: DashboardKPIs = {
  totalShipments: 1247,
  inTransit: 84,
  onHold: 7,
  delivered: 1156,
  totalUsers: 342,
  shipmentsThisMonth: 38,
  deliveriesThisMonth: 31,
  oceanShipments: 684,
  airShipments: 312,
  railShipments: 156,
  roadShipments: 95,
  oceanOnHold: 3,
  airOnHold: 2,
  railOnHold: 1,
  roadOnHold: 1,
};

// ──────────────────────────────────────────────
// Monthly Volume Trend
// ──────────────────────────────────────────────

export const DEMO_MONTHLY_VOLUMES: MonthlyVolume[] = [
  { month: "Jun", shipments: 42, deliveries: 38 },
  { month: "Jul", shipments: 56, deliveries: 49 },
  { month: "Aug", shipments: 61, deliveries: 55 },
  { month: "Sep", shipments: 48, deliveries: 44 },
  { month: "Oct", shipments: 73, deliveries: 67 },
  { month: "Nov", shipments: 38, deliveries: 31 },
];

// ──────────────────────────────────────────────
// Shipments
// ──────────────────────────────────────────────

export const DEMO_SHIPMENTS: Shipment[] = [
  {
    id: "shp-001",
    trackingCode: "RIL-8492-3019-CA",
    mode: "ocean",
    status: "in_transit",
    originName: "Port of Shanghai",
    originCode: "CNSHA",
    originCountry: "China",
    originCoordinates: [121.5, 31.0],
    destinationName: "Port of Montreal",
    destinationCode: "CAMTR",
    destinationCountry: "Canada",
    destinationCoordinates: [-73.55, 45.5],
    departureDate: "2026-10-12T08:00:00Z",
    estimatedDeliveryDate: "2026-11-18T14:00:00Z",
    isPaused: false,
    conveyanceName: "MV Pacific Trader",
    conveyanceIdentifier: "IMO 9811000",
    voyageNumber: "2403E",
    consignmentReference: "RILU8492019",
    containerNumber: "MSKU 729183-4",
    sealNumber: "RIL-99201",
    totalPieces: 12,
    grossWeightKg: 18450,
    volumeCbm: 33.2,
    goodsDescription: "Industrial machinery parts and electronic assemblies",
    routeCoordinates: [
      [121.5, 31.0],
      [104.0, 1.35],
      [43.15, 12.6],
      [32.3, 31.2],
      [9.5, 36.8],
      [-5.35, 36.15],
      [-73.55, 45.5],
    ],
    waypoints: [
      { id: "wp-1", name: "Port of Shanghai", code: "CNSHA", country: "China", coordinates: [121.5, 31.0], isCompleted: true, estimatedDeparture: "2026-10-13T16:30:00Z", actualDeparture: "2026-10-13T16:30:00Z" },
      { id: "wp-2", name: "Strait of Malacca", country: "Singapore", coordinates: [104.0, 1.35], isCompleted: true, estimatedArrival: "2026-10-19T06:00:00Z", actualArrival: "2026-10-19T05:45:00Z" },
      { id: "wp-3", name: "Bab el-Mandeb Strait", country: "Yemen", coordinates: [43.15, 12.6], isCompleted: true, estimatedArrival: "2026-10-26T12:00:00Z", actualArrival: "2026-10-26T14:20:00Z" },
      { id: "wp-4", name: "Suez Canal", country: "Egypt", coordinates: [32.3, 31.2], isCompleted: false, estimatedArrival: "2026-10-29T08:00:00Z" },
      { id: "wp-5", name: "Strait of Gibraltar", country: "Spain", coordinates: [-5.35, 36.15], isCompleted: false, estimatedArrival: "2026-11-02T10:00:00Z" },
      { id: "wp-6", name: "Port of Montreal", code: "CAMTR", country: "Canada", coordinates: [-73.55, 45.5], isCompleted: false, estimatedArrival: "2026-11-18T14:00:00Z" },
    ],
    milestones: [
      { id: "ms-1", code: "GTIN", title: "Gate-In Origin", description: "Container delivered to departure terminal", locationName: "Shanghai Yangshan Terminal", locationCode: "CNSHA", timestamp: "2026-10-12T08:00:00Z", isCompleted: true, coordinates: [121.5, 31.0] },
      { id: "ms-2", code: "LOAD", title: "Loaded on Vessel", description: "Container secured on MV Pacific Trader", locationName: "Shanghai Yangshan Terminal", locationCode: "CNSHA", timestamp: "2026-10-13T16:30:00Z", isCompleted: true, coordinates: [121.5, 31.0] },
      { id: "ms-3", code: "DEPA", title: "Vessel Departed", description: "Ship departed Port of Loading", locationName: "Port of Shanghai", locationCode: "CNSHA", timestamp: "2026-10-13T18:00:00Z", isCompleted: true, coordinates: [121.5, 31.0] },
      { id: "ms-4", code: "ARRI", title: "Vessel Berthed", description: "Ship arrived at destination port", locationName: "Port of Montreal", locationCode: "CAMTR", timestamp: "2026-11-18T14:00:00Z", isCompleted: false, coordinates: [-73.55, 45.5] },
      { id: "ms-5", code: "CUSR", title: "Customs Cleared", description: "Regulatory import clearance granted", locationName: "CBSA Montreal", timestamp: "2026-11-19T09:00:00Z", isCompleted: false },
      { id: "ms-6", code: "DLV", title: "Delivered", description: "Cargo received by consignee", locationName: "Montreal Warehouse", timestamp: "2026-11-20T14:00:00Z", isCompleted: false },
    ],
    createdAt: "2026-10-10T10:00:00Z",
    updatedAt: "2026-10-26T14:20:00Z",
  },
  {
    id: "shp-002",
    trackingCode: "RIL-920-84920194",
    mode: "air",
    status: "in_transit",
    originName: "Shanghai Pudong International",
    originCode: "PVG",
    originCountry: "China",
    originCoordinates: [121.8, 31.15],
    destinationName: "Montreal-Trudeau International",
    destinationCode: "YUL",
    destinationCountry: "Canada",
    destinationCoordinates: [-73.74, 45.47],
    departureDate: "2026-11-01T15:40:00Z",
    estimatedDeliveryDate: "2026-11-03T14:30:00Z",
    isPaused: false,
    conveyanceName: "AC026",
    conveyanceIdentifier: "Boeing 777-300ER",
    consignmentReference: "020-84920194",
    totalPieces: 3,
    grossWeightKg: 245,
    volumeCbm: 1.8,
    goodsDescription: "Pharmaceutical biocontainers (temperature-controlled)",
    routeCoordinates: [
      [121.8, 31.15],
      [-123.18, 49.19],
      [-73.74, 45.47],
    ],
    waypoints: [
      { id: "wp-a1", name: "Shanghai Pudong (PVG)", code: "PVG", country: "China", coordinates: [121.8, 31.15], isCompleted: true, estimatedDeparture: "2026-11-01T15:40:00Z", actualDeparture: "2026-11-01T15:40:00Z" },
      { id: "wp-a2", name: "Vancouver (YVR)", code: "YVR", country: "Canada", coordinates: [-123.18, 49.19], isCompleted: true, estimatedArrival: "2026-11-01T19:10:00Z", actualArrival: "2026-11-01T19:10:00Z" },
      { id: "wp-a3", name: "Montreal-Trudeau (YUL)", code: "YUL", country: "Canada", coordinates: [-73.74, 45.47], isCompleted: false, estimatedArrival: "2026-11-02T06:45:00Z" },
    ],
    milestones: [
      { id: "ms-a1", code: "RCS", title: "Received from Shipper", description: "Cargo checked in at freight terminal", locationName: "PVG Cargo Terminal", locationCode: "PVG", timestamp: "2026-11-01T09:30:00Z", isCompleted: true, coordinates: [121.8, 31.15] },
      { id: "ms-a2", code: "DEP", title: "Flight Departed", description: "Aircraft departed runway", locationName: "Shanghai Pudong (PVG)", locationCode: "PVG", timestamp: "2026-11-01T15:40:00Z", isCompleted: true, coordinates: [121.8, 31.15] },
      { id: "ms-a3", code: "ARR", title: "Flight Arrived", description: "Aircraft touched down at destination", locationName: "Montreal-Trudeau (YUL)", locationCode: "YUL", timestamp: "2026-11-02T06:45:00Z", isCompleted: false, coordinates: [-73.74, 45.47] },
      { id: "ms-a4", code: "DLV", title: "Delivered", description: "Cargo signed and released", locationName: "Montreal Consignee Warehouse", timestamp: "2026-11-03T14:30:00Z", isCompleted: false },
    ],
    createdAt: "2026-10-28T12:00:00Z",
    updatedAt: "2026-11-01T15:40:00Z",
  },
  {
    id: "shp-003",
    trackingCode: "RIL-CIM-89201923",
    mode: "rail",
    status: "customs_hold",
    originName: "Chicago Corwith Yard",
    originCode: "USCWI",
    originCountry: "United States",
    originCoordinates: [-87.65, 41.85],
    destinationName: "Montreal Taschereau Yard",
    destinationCode: "CAMTR",
    destinationCountry: "Canada",
    destinationCoordinates: [-73.55, 45.5],
    departureDate: "2026-10-28T06:00:00Z",
    estimatedDeliveryDate: "2026-11-05T18:00:00Z",
    isPaused: true,
    pausedAtTimestamp: "2026-11-02T14:30:00Z",
    pausedLocationName: "Sarnia Border Crossing",
    pausedCoordinates: [-82.4, 42.97],
    pausedReason: "Customs inspection required — agricultural products declaration review",
    conveyanceName: "BNSF-Q-CHISPO",
    conveyanceIdentifier: "TTX 549201",
    consignmentReference: "CIM-89201923",
    containerNumber: "CN 593821",
    totalPieces: 48,
    grossWeightKg: 62000,
    volumeCbm: 120,
    goodsDescription: "Double-stack container freight — mixed consumer electronics and agricultural equipment",
    routeCoordinates: [
      [-87.65, 41.85],
      [-85.0, 42.3],
      [-82.4, 42.97],
      [-79.38, 43.65],
      [-73.55, 45.5],
    ],
    waypoints: [
      { id: "wp-r1", name: "Chicago Corwith Yard", code: "USCWI", country: "United States", coordinates: [-87.65, 41.85], isCompleted: true, estimatedDeparture: "2026-10-28T06:00:00Z", actualDeparture: "2026-10-28T06:00:00Z" },
      { id: "wp-r2", name: "Battle Creek Junction", country: "United States", coordinates: [-85.0, 42.3], isCompleted: true, estimatedArrival: "2026-10-29T14:00:00Z", actualArrival: "2026-10-29T13:45:00Z" },
      { id: "wp-r3", name: "Sarnia Border Crossing", country: "Canada", coordinates: [-82.4, 42.97], isCompleted: false, estimatedArrival: "2026-10-30T22:00:00Z", notes: "CUSTOMS HOLD — Agricultural products declaration review" },
      { id: "wp-r4", name: "Toronto Intermodal", country: "Canada", coordinates: [-79.38, 43.65], isCompleted: false, estimatedArrival: "2026-11-02T08:00:00Z" },
      { id: "wp-r5", name: "Montreal Taschereau Yard", code: "CAMTR", country: "Canada", coordinates: [-73.55, 45.5], isCompleted: false, estimatedArrival: "2026-11-05T18:00:00Z" },
    ],
    milestones: [
      { id: "ms-r1", code: "RAMP_IN", title: "Ramp In", description: "Container entered rail intermodal ramp", locationName: "Chicago Corwith Yard", timestamp: "2026-10-27T14:00:00Z", isCompleted: true, coordinates: [-87.65, 41.85] },
      { id: "ms-r2", code: "MOUNTED", title: "Mounted on Railcar", description: "Container locked onto double-stack railcar", locationName: "Chicago Corwith Yard", timestamp: "2026-10-28T05:00:00Z", isCompleted: true, coordinates: [-87.65, 41.85] },
      { id: "ms-r3", code: "TRAIN_DEP", title: "Train Departed", description: "Freight train departed classification yard", locationName: "Chicago Corwith Yard", timestamp: "2026-10-28T06:00:00Z", isCompleted: true, coordinates: [-87.65, 41.85] },
      { id: "ms-r4", code: "INTERCHANGE", title: "Border Interchange", description: "Customs inspection hold at US-Canada border", locationName: "Sarnia Border Crossing", timestamp: "2026-11-02T14:30:00Z", isCompleted: false, coordinates: [-82.4, 42.97] },
      { id: "ms-r5", code: "FINAL_DLV", title: "Final Delivery", description: "Delivered to consignee warehouse", locationName: "Montreal Taschereau Yard", timestamp: "2026-11-05T18:00:00Z", isCompleted: false },
    ],
    createdAt: "2026-10-25T09:00:00Z",
    updatedAt: "2026-11-02T14:30:00Z",
  },
  {
    id: "shp-004",
    trackingCode: "RIL-7291-4820-NL",
    mode: "ocean",
    status: "delivered",
    originName: "Port of Rotterdam",
    originCode: "NLRTM",
    originCountry: "Netherlands",
    originCoordinates: [4.5, 51.9],
    destinationName: "Port of Halifax",
    destinationCode: "CAHAL",
    destinationCountry: "Canada",
    destinationCoordinates: [-63.57, 44.65],
    departureDate: "2026-09-15T10:00:00Z",
    estimatedDeliveryDate: "2026-10-02T16:00:00Z",
    actualDeliveryDate: "2026-10-01T14:30:00Z",
    isPaused: false,
    conveyanceName: "MV Atlantic Crown",
    conveyanceIdentifier: "IMO 9750032",
    voyageNumber: "2409W",
    consignmentReference: "RILU7291482",
    containerNumber: "CMAU 492019-1",
    sealNumber: "RIL-88402",
    totalPieces: 6,
    grossWeightKg: 8200,
    volumeCbm: 14.5,
    goodsDescription: "Automotive components and precision tooling equipment",
    routeCoordinates: [
      [4.5, 51.9],
      [-8.0, 51.0],
      [-30.0, 48.0],
      [-63.57, 44.65],
    ],
    waypoints: [
      { id: "wp-d1", name: "Port of Rotterdam", code: "NLRTM", country: "Netherlands", coordinates: [4.5, 51.9], isCompleted: true, estimatedDeparture: "2026-09-15T10:00:00Z", actualDeparture: "2026-09-15T10:00:00Z" },
      { id: "wp-d2", name: "Port of Halifax", code: "CAHAL", country: "Canada", coordinates: [-63.57, 44.65], isCompleted: true, estimatedArrival: "2026-10-02T16:00:00Z", actualArrival: "2026-10-01T14:30:00Z" },
    ],
    milestones: [
      { id: "ms-d1", code: "GTIN", title: "Gate-In Origin", description: "Container received at terminal", locationName: "Rotterdam Europoort", locationCode: "NLRTM", timestamp: "2026-09-14T08:00:00Z", isCompleted: true, coordinates: [4.5, 51.9] },
      { id: "ms-d2", code: "LOAD", title: "Loaded on Vessel", description: "Secured on MV Atlantic Crown", locationName: "Rotterdam Europoort", locationCode: "NLRTM", timestamp: "2026-09-15T06:00:00Z", isCompleted: true, coordinates: [4.5, 51.9] },
      { id: "ms-d3", code: "DEPA", title: "Vessel Departed", description: "Ship departed Rotterdam", locationName: "Port of Rotterdam", locationCode: "NLRTM", timestamp: "2026-09-15T10:00:00Z", isCompleted: true, coordinates: [4.5, 51.9] },
      { id: "ms-d4", code: "ARRI", title: "Vessel Berthed", description: "Arrived at Halifax", locationName: "Port of Halifax", locationCode: "CAHAL", timestamp: "2026-10-01T14:30:00Z", isCompleted: true, coordinates: [-63.57, 44.65] },
      { id: "ms-d5", code: "DLV", title: "Delivered", description: "Cargo released to consignee", locationName: "Halifax Distribution Centre", timestamp: "2026-10-01T14:30:00Z", isCompleted: true },
    ],
    createdAt: "2026-09-10T11:00:00Z",
    updatedAt: "2026-10-01T14:30:00Z",
  },
  {
    id: "shp-005",
    trackingCode: "RIL-5530-1192-DE",
    mode: "air",
    status: "delivered",
    originName: "Frankfurt Airport",
    originCode: "FRA",
    originCountry: "Germany",
    originCoordinates: [8.57, 50.03],
    destinationName: "Toronto Pearson International",
    destinationCode: "YYZ",
    destinationCountry: "Canada",
    destinationCoordinates: [-79.63, 43.68],
    departureDate: "2026-10-20T11:00:00Z",
    estimatedDeliveryDate: "2026-10-22T08:00:00Z",
    actualDeliveryDate: "2026-10-21T19:45:00Z",
    isPaused: false,
    conveyanceName: "LH8220",
    conveyanceIdentifier: "Boeing 747-8F",
    consignmentReference: "220-55301192",
    totalPieces: 8,
    grossWeightKg: 1820,
    volumeCbm: 6.4,
    goodsDescription: "High-value optical instrumentation equipment",
    routeCoordinates: [
      [8.57, 50.03],
      [-79.63, 43.68],
    ],
    waypoints: [
      { id: "wp-e1", name: "Frankfurt (FRA)", code: "FRA", country: "Germany", coordinates: [8.57, 50.03], isCompleted: true, estimatedDeparture: "2026-10-20T11:00:00Z", actualDeparture: "2026-10-20T11:00:00Z" },
      { id: "wp-e2", name: "Toronto Pearson (YYZ)", code: "YYZ", country: "Canada", coordinates: [-79.63, 43.68], isCompleted: true, estimatedArrival: "2026-10-20T16:30:00Z", actualArrival: "2026-10-20T16:15:00Z" },
    ],
    milestones: [
      { id: "ms-e1", code: "RCS", title: "Received from Shipper", description: "Cargo checked in", locationName: "FRA Cargo City", locationCode: "FRA", timestamp: "2026-10-20T07:00:00Z", isCompleted: true, coordinates: [8.57, 50.03] },
      { id: "ms-e2", code: "DEP", title: "Flight Departed", description: "LH8220 departed Frankfurt", locationName: "Frankfurt (FRA)", locationCode: "FRA", timestamp: "2026-10-20T11:00:00Z", isCompleted: true, coordinates: [8.57, 50.03] },
      { id: "ms-e3", code: "ARR", title: "Flight Arrived", description: "Aircraft landed Toronto", locationName: "Toronto Pearson (YYZ)", locationCode: "YYZ", timestamp: "2026-10-20T16:15:00Z", isCompleted: true, coordinates: [-79.63, 43.68] },
      { id: "ms-e4", code: "DLV", title: "Delivered", description: "Released to consignee", locationName: "Toronto Distribution Hub", timestamp: "2026-10-21T19:45:00Z", isCompleted: true },
    ],
    createdAt: "2026-10-18T09:00:00Z",
    updatedAt: "2026-10-21T19:45:00Z",
  },
  {
    id: "shp-006",
    trackingCode: "RIL-6104-9923-US",
    mode: "road",
    status: "in_transit",
    originName: "Detroit Logistics Terminal",
    originCode: "USDET",
    originCountry: "United States",
    originCoordinates: [-83.05, 42.33],
    destinationName: "Toronto Freight Hub",
    destinationCode: "CATOR",
    destinationCountry: "Canada",
    destinationCoordinates: [-79.38, 43.65],
    departureDate: "2026-11-09T06:00:00Z",
    estimatedDeliveryDate: "2026-11-12T18:00:00Z",
    isPaused: false,
    conveyanceName: "Kenworth T680 / Trailer #5402",
    conveyanceIdentifier: "VIN 1XKYDP9X8",
    consignmentReference: "CMR-61049923",
    containerNumber: "TRL-5402",
    sealNumber: "RIL-60192",
    totalPieces: 14,
    grossWeightKg: 12400,
    volumeCbm: 42.0,
    goodsDescription: "Cross-border automotive sub-assemblies and stamped panels",
    routeCoordinates: [
      [-83.05, 42.33],
      [-82.4, 42.97],
      [-80.25, 43.14],
      [-79.38, 43.65],
    ],
    waypoints: [
      { id: "wp-rd1", name: "Detroit Terminal", code: "USDET", country: "United States", coordinates: [-83.05, 42.33], isCompleted: true, estimatedDeparture: "2026-11-09T06:00:00Z", actualDeparture: "2026-11-09T06:00:00Z" },
      { id: "wp-rd2", name: "Ambassador Bridge Border", country: "United States", coordinates: [-83.07, 42.31], isCompleted: true, estimatedArrival: "2026-11-09T08:00:00Z", actualArrival: "2026-11-09T08:15:00Z" },
      { id: "wp-rd3", name: "London ON Highway 401", country: "Canada", coordinates: [-81.25, 42.98], isCompleted: true, estimatedArrival: "2026-11-09T13:00:00Z", actualArrival: "2026-11-09T13:10:00Z" },
      { id: "wp-rd4", name: "Toronto Freight Hub", code: "CATOR", country: "Canada", coordinates: [-79.38, 43.65], isCompleted: false, estimatedArrival: "2026-11-12T18:00:00Z" },
    ],
    milestones: [
      { id: "ms-rd1", code: "DISP", title: "Dispatched from Terminal", description: "Truck departed Detroit depot", locationName: "Detroit Logistics Terminal", timestamp: "2026-11-09T06:00:00Z", isCompleted: true, coordinates: [-83.05, 42.33] },
      { id: "ms-rd2", code: "CBRD", title: "Cross-Border Cleared", description: "Cleared CBSA commercial booth", locationName: "Windsor Port of Entry", timestamp: "2026-11-09T08:30:00Z", isCompleted: true, coordinates: [-83.07, 42.31] },
      { id: "ms-rd3", code: "INTR", title: "In Transit — Highway 401", description: "En route to delivery consignee", locationName: "London ON Corridor", timestamp: "2026-11-09T13:10:00Z", isCompleted: true },
      { id: "ms-rd4", code: "DLV", title: "Out for Delivery", description: "Arriving at Toronto dock", locationName: "Toronto Freight Hub", timestamp: "2026-11-12T18:00:00Z", isCompleted: false },
    ],
    createdAt: "2026-11-08T14:00:00Z",
    updatedAt: "2026-11-09T13:10:00Z",
  },
];

// ──────────────────────────────────────────────
// Platform Users
// ──────────────────────────────────────────────

export const DEMO_USERS: PlatformUser[] = [];

// ──────────────────────────────────────────────
// Email Templates
// ──────────────────────────────────────────────

export const DEMO_EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: "tpl-001",
    name: "Shipment Delay Notice",
    subject: "Update: Your Shipment {{trackingCode}} Has Been Delayed",
    body: "Dear {{recipientName}},\n\nWe are writing to inform you that your shipment {{trackingCode}} has experienced a delay due to {{reason}}.\n\nRevised estimated delivery: {{newETA}}\n\nWe sincerely apologize for any inconvenience and will keep you updated on the progress.\n\nBest regards,\nRILFREIGHT Operations",
  },
  {
    id: "tpl-002",
    name: "Customs Clearance Update",
    subject: "Customs Update: Shipment {{trackingCode}}",
    body: "Dear {{recipientName}},\n\nYour shipment {{trackingCode}} is currently undergoing customs clearance at {{location}}.\n\nExpected clearance time: {{clearanceETA}}\n\nNo action is required from your side at this time. We will notify you once the shipment clears customs.\n\nBest regards,\nRILFREIGHT Operations",
  },
  {
    id: "tpl-003",
    name: "Delivery Confirmation",
    subject: "Delivered: Your Shipment {{trackingCode}} Has Arrived",
    body: "Dear {{recipientName}},\n\nWe are pleased to confirm that your shipment {{trackingCode}} has been successfully delivered to {{destination}}.\n\nDelivered on: {{deliveryDate}}\nReceived by: {{receiverName}}\n\nThank you for choosing RILFREIGHT.\n\nBest regards,\nRILFREIGHT Operations",
  },
  {
    id: "tpl-004",
    name: "General Notification",
    subject: "RILFREIGHT — Important Update",
    body: "Dear {{recipientName}},\n\n{{messageBody}}\n\nIf you have any questions, please do not hesitate to contact us at operations@rilfreight.com.\n\nBest regards,\nRILFREIGHT Operations",
  },
];

// ──────────────────────────────────────────────
// Platform Settings
// ──────────────────────────────────────────────

export const DEMO_SETTINGS: PlatformSettings = {
  carrierCode: "RIL",
  companyName: "RILFREIGHT",
  supportEmail: "operations@rilfreight.com",
  defaultOriginCode: "CNSHA",
  defaultDestinationCode: "CAMTR",
  notificationsEnabled: true,
  emailNotifications: true,
};
