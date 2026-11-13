/**
 * RILFREIGHT Milestone & Dwell Time Engine
 * 
 * Generates authentic chronological tracking milestone timelines with:
 * 1. Operational dwell times (`dwellHours`) representing gating, loading, rail yard switching, and inspections.
 * 2. Strict chronological monotonicity (`timestamp[i] <= timestamp[i+1]`).
 * 3. Default customs pause gate (`isHoldGate: true`) on international destination customs clearance (`CUSR`),
 *    which places shipment on customs hold until released by an administrator.
 *    Domestic shipments guarantee `isHoldGate: false`.
 * 4. Mode-specific operational codes (Ocean: GTIN, LOAD, DEPA, CANL, ARRI, CUSR, DLV;
 *    Air: RCS, SEC, DEP, ARR, RCF, CUSR, DLV; Rail: RAMP_IN, MOUNTED, TRAIN_DEP, INTERCHANGE, RAMP_OUT, DLV;
 *    Road: DISP, INTR, ARRI, OFD, DLV).
 */

import type {
  TrackingMilestone,
  TransportMode,
  RouteWaypoint,
} from "@/shared/types";

export interface MilestoneGenerationParams {
  mode: TransportMode;
  origin: {
    name: string;
    code?: string;
    city?: string;
    country: string;
    countryCode?: string;
    coordinates?: [number, number];
  };
  destination: {
    name: string;
    code?: string;
    city?: string;
    country: string;
    countryCode?: string;
    coordinates?: [number, number];
  };
  departureDate: string;           // ISO 8601 string
  estimatedDeliveryDate: string;   // ISO 8601 string
  waypoints?: RouteWaypoint[];
  passages?: string[];             // e.g. ['panama', 'suez']
  conveyanceName?: string;
}

export type { TrackingMilestone };

/**
 * Interpolates an ISO timestamp proportionally between departure and delivery dates.
 */
function interpolateTime(
  depTime: number,
  delTime: number,
  ratio: number,
  offsetHours?: number
): string {
  const span = Math.max(delTime - depTime, 3600 * 1000); // Minimum 1 hour span
  let targetTime = depTime + span * ratio;
  if (offsetHours !== undefined) {
    targetTime += offsetHours * 3600 * 1000;
  }
  return new Date(targetTime).toISOString();
}

/**
 * Determines if a shipment is international by comparing origin and destination countries.
 */
function checkIsInternational(
  origin: MilestoneGenerationParams["origin"],
  destination: MilestoneGenerationParams["destination"]
): boolean {
  if (origin.countryCode && destination.countryCode) {
    return origin.countryCode.trim().toUpperCase() !== destination.countryCode.trim().toUpperCase();
  }
  if (origin.country && destination.country) {
    return origin.country.trim().toLowerCase() !== destination.country.trim().toLowerCase();
  }
  return false;
}

/**
 * Generates an authentic sequence of operational tracking milestones with realistic dwell times
 * and automatic pause gates (`isHoldGate: true`) for international customs clearance.
 */
export function generateMilestones(
  params: MilestoneGenerationParams
): TrackingMilestone[] {
  const {
    mode,
    origin,
    destination,
    departureDate,
    estimatedDeliveryDate,
    passages = [],
    conveyanceName = "Carrier Conveyance",
  } = params;

  const depMs = new Date(departureDate).getTime();
  const delMs = new Date(estimatedDeliveryDate).getTime();
  const now = Date.now();

  const isInternational = checkIsInternational(origin, destination);
  const isPast = (iso: string) => new Date(iso).getTime() <= now;

  const rawMilestones: Array<Omit<TrackingMilestone, "id">> = [];

  switch (mode) {
    case "ocean": {
      // 1. Gate-In Origin Terminal (GTIN) - 24h before departure
      const gtinTime = interpolateTime(depMs, delMs, 0, -24);
      rawMilestones.push({
        code: "GTIN",
        title: "Gate-In Origin Terminal",
        description: `Container received and scanned at origin container terminal gate (${origin.name})`,
        locationName: origin.name,
        locationCode: origin.code,
        timestamp: gtinTime,
        isCompleted: isPast(gtinTime),
        coordinates: origin.coordinates,
        dwellHours: 18,
        isHoldGate: false,
        status: isPast(gtinTime) ? "completed" : "pending",
      });

      // 2. Loaded on Vessel (LOAD) - 6h before departure
      const loadTime = interpolateTime(depMs, delMs, 0, -6);
      rawMilestones.push({
        code: "LOAD",
        title: "Loaded on Vessel",
        description: `Container stowed and secured aboard ${conveyanceName} at container berth`,
        locationName: origin.name,
        locationCode: origin.code,
        timestamp: loadTime,
        isCompleted: isPast(loadTime),
        coordinates: origin.coordinates,
        dwellHours: 6,
        isHoldGate: false,
        status: isPast(loadTime) ? "completed" : "pending",
      });

      // 3. Vessel Departed (DEPA) - departure time
      const depTime = new Date(depMs).toISOString();
      rawMilestones.push({
        code: "DEPA",
        title: "Vessel Departed",
        description: `${conveyanceName} cleared harbour pilotage and commenced deep-sea ocean transit`,
        locationName: origin.name,
        locationCode: origin.code,
        timestamp: depTime,
        isCompleted: isPast(depTime),
        coordinates: origin.coordinates,
        dwellHours: 0,
        isHoldGate: false,
        status: isPast(depTime) ? "completed" : "pending",
      });

      // 4. Canal transit if applicable (Panama or Suez)
      if (passages.includes("panama")) {
        const panamaTime = interpolateTime(depMs, delMs, 0.65);
        rawMilestones.push({
          code: "CANL",
          title: "Panama Canal Transit",
          description: `${conveyanceName} completed navigational passage through Panama Canal locks (Miraflores & Gatun Locks)`,
          locationName: "Panama Canal (Balboa / Colon)",
          locationCode: "PAPOB",
          timestamp: panamaTime,
          isCompleted: isPast(panamaTime),
          coordinates: [-79.7, 9.1],
          dwellHours: 12,
          isHoldGate: false,
          status: isPast(panamaTime) ? "completed" : "pending",
        });
      }

      if (passages.includes("suez")) {
        const suezTime = interpolateTime(depMs, delMs, 0.5);
        rawMilestones.push({
          code: "CANL",
          title: "Suez Canal Transit",
          description: `${conveyanceName} joined northbound convoy and successfully completed transit of Suez Canal`,
          locationName: "Suez Canal Transit Corridor",
          locationCode: "EGPSD",
          timestamp: suezTime,
          isCompleted: isPast(suezTime),
          coordinates: [32.31, 31.26],
          dwellHours: 14,
          isHoldGate: false,
          status: isPast(suezTime) ? "completed" : "pending",
        });
      }

      // 5. Vessel Berthed (ARRI) - 24h before delivery
      const arriTime = interpolateTime(depMs, delMs, 1, -24);
      rawMilestones.push({
        code: "ARRI",
        title: "Vessel Berthed",
        description: `${conveyanceName} docked safely at destination container terminal (${destination.name})`,
        locationName: destination.name,
        locationCode: destination.code,
        timestamp: arriTime,
        isCompleted: isPast(arriTime),
        coordinates: destination.coordinates,
        dwellHours: 6,
        isHoldGate: false,
        status: isPast(arriTime) ? "completed" : "pending",
      });

      // 6. Import Customs Clearance (CUSR) - 10h before delivery
      const cusrTime = interpolateTime(depMs, delMs, 1, -10);
      rawMilestones.push({
        code: "CUSR",
        title: "Import Customs Cleared",
        description: isInternational
          ? `Import customs regulatory release granted by port authority customs officers`
          : `Domestic port security and cargo manifest clearance verified`,
        locationName: `${destination.city || destination.name} Port Customs Inspection Facility`,
        locationCode: destination.code,
        timestamp: cusrTime,
        isCompleted: isPast(cusrTime),
        coordinates: destination.coordinates,
        dwellHours: isInternational ? 16 : 4,
        isHoldGate: isInternational, // Active pause gate for international customs
        status: isPast(cusrTime) ? "completed" : "pending",
      });

      // 7. Delivered to Consignee (DLV) - delivery time
      const dlvTime = new Date(delMs).toISOString();
      rawMilestones.push({
        code: "DLV",
        title: "Delivered to Consignee",
        description: `Container released from terminal gates and accepted by consignee`,
        locationName: `${destination.city || destination.name} Logistics Distribution Center`,
        locationCode: destination.code,
        timestamp: dlvTime,
        isCompleted: isPast(dlvTime),
        coordinates: destination.coordinates,
        dwellHours: 0,
        isHoldGate: false,
        status: isPast(dlvTime) ? "completed" : "pending",
      });
      break;
    }

    case "air": {
      // 1. Received from Shipper (RCS) - 6h before departure
      const rcsTime = interpolateTime(depMs, delMs, 0, -6);
      rawMilestones.push({
        code: "RCS",
        title: "Received from Shipper",
        description: `Air consignment received and screened at origin airfreight cargo warehouse (${origin.name})`,
        locationName: origin.name,
        locationCode: origin.code,
        timestamp: rcsTime,
        isCompleted: isPast(rcsTime),
        coordinates: origin.coordinates,
        dwellHours: 2,
        isHoldGate: false,
        status: isPast(rcsTime) ? "completed" : "pending",
      });

      // 2. Flight Departed (DEP) - departure time
      const depTime = new Date(depMs).toISOString();
      rawMilestones.push({
        code: "DEP",
        title: "Flight Departed",
        description: `Aircraft ${conveyanceName} wheels up on scheduled commercial air cargo flight path`,
        locationName: origin.name,
        locationCode: origin.code,
        timestamp: depTime,
        isCompleted: isPast(depTime),
        coordinates: origin.coordinates,
        dwellHours: 0,
        isHoldGate: false,
        status: isPast(depTime) ? "completed" : "pending",
      });

      // 3. Flight Arrived (ARR) - ~70% into schedule
      const arrTime = interpolateTime(depMs, delMs, 0.7);
      rawMilestones.push({
        code: "ARR",
        title: "Flight Arrived",
        description: `Aircraft touched down safely at destination airfield (${destination.name})`,
        locationName: destination.name,
        locationCode: destination.code,
        timestamp: arrTime,
        isCompleted: isPast(arrTime),
        coordinates: destination.coordinates,
        dwellHours: 2,
        isHoldGate: false,
        status: isPast(arrTime) ? "completed" : "pending",
      });

      // 4. Cargo Received from Flight (RCF) - ~85% into schedule
      const rcfTime = interpolateTime(depMs, delMs, 0.85);
      rawMilestones.push({
        code: "RCF",
        title: "Cargo Received from Flight",
        description: `ULD pallets unloaded and air waybill parcel manifests verified at air cargo facility`,
        locationName: `${destination.city || destination.name} Air Cargo Hub`,
        locationCode: destination.code,
        timestamp: rcfTime,
        isCompleted: isPast(rcfTime),
        coordinates: destination.coordinates,
        dwellHours: 3,
        isHoldGate: false,
        status: isPast(rcfTime) ? "completed" : "pending",
      });

      // 5. Import Customs Cleared (CUSR) - 2h before delivery
      const cusrTime = interpolateTime(depMs, delMs, 1, -2);
      rawMilestones.push({
        code: "CUSR",
        title: "Customs Clearance Granted",
        description: isInternational
          ? `Air cargo import customs release and clearance documentation stamped by border control`
          : `Domestic airfreight security release finalized`,
        locationName: `${destination.city || destination.name} Airport Customs Facility`,
        locationCode: destination.code,
        timestamp: cusrTime,
        isCompleted: isPast(cusrTime),
        coordinates: destination.coordinates,
        dwellHours: isInternational ? 6 : 2,
        isHoldGate: isInternational, // Active pause gate for international customs
        status: isPast(cusrTime) ? "completed" : "pending",
      });

      // 6. Delivered (DLV) - delivery time
      const dlvTime = new Date(delMs).toISOString();
      rawMilestones.push({
        code: "DLV",
        title: "Air Consignment Delivered",
        description: `Consignment released for final delivery and air waybill proof of delivery acknowledged`,
        locationName: `${destination.city || destination.name} Destination Receiving Facility`,
        locationCode: destination.code,
        timestamp: dlvTime,
        isCompleted: isPast(dlvTime),
        coordinates: destination.coordinates,
        dwellHours: 0,
        isHoldGate: false,
        status: isPast(dlvTime) ? "completed" : "pending",
      });
      break;
    }

    case "rail": {
      // 1. Ramp In (RAMP_IN) - 12h before departure
      const rampInTime = interpolateTime(depMs, delMs, 0, -12);
      rawMilestones.push({
        code: "RAMP_IN",
        title: "Ramp-In at Intermodal Yard",
        description: `Intermodal chassis entered gate and scanned at rail terminal (${origin.name})`,
        locationName: origin.name,
        locationCode: origin.code,
        timestamp: rampInTime,
        isCompleted: isPast(rampInTime),
        coordinates: origin.coordinates,
        dwellHours: 10,
        isHoldGate: false,
        status: isPast(rampInTime) ? "completed" : "pending",
      });

      // 2. Mounted on Railcar (MOUNTED) - 2h before departure
      const mountedTime = interpolateTime(depMs, delMs, 0, -2);
      rawMilestones.push({
        code: "MOUNTED",
        title: "Mounted on Railcar",
        description: `Container hoisted and locked onto double-stack intermodal rail well-car`,
        locationName: origin.name,
        locationCode: origin.code,
        timestamp: mountedTime,
        isCompleted: isPast(mountedTime),
        coordinates: origin.coordinates,
        dwellHours: 2,
        isHoldGate: false,
        status: isPast(mountedTime) ? "completed" : "pending",
      });

      // 3. Train Departed (TRAIN_DEP) - departure time
      const depTime = new Date(depMs).toISOString();
      rawMilestones.push({
        code: "TRAIN_DEP",
        title: "Intermodal Train Departed",
        description: `Manifest freight train dispatched along mainline rail freight corridor`,
        locationName: origin.name,
        locationCode: origin.code,
        timestamp: depTime,
        isCompleted: isPast(depTime),
        coordinates: origin.coordinates,
        dwellHours: 0,
        isHoldGate: false,
        status: isPast(depTime) ? "completed" : "pending",
      });

      // 4. Gateway Interchange (INTERCHANGE) - 50% into schedule
      const interTime = interpolateTime(depMs, delMs, 0.5);
      rawMilestones.push({
        code: "INTERCHANGE",
        title: "Corridor Rail Gateway Interchange",
        description: `Train inspected and switched through regional intermodal classification division point`,
        locationName: "Corridor Rail Gateway Interchange",
        timestamp: interTime,
        isCompleted: isPast(interTime),
        dwellHours: 4,
        isHoldGate: false,
        status: isPast(interTime) ? "completed" : "pending",
      });

      // 5. Arrived at Destination Ramp (RAMP_OUT) - 6h before delivery
      const rampOutTime = interpolateTime(depMs, delMs, 1, -6);
      rawMilestones.push({
        code: "RAMP_OUT",
        title: "Arrived at Destination Rail Ramp",
        description: `Train arrived and container grounded from railcar at destination classification yard`,
        locationName: destination.name,
        locationCode: destination.code,
        timestamp: rampOutTime,
        isCompleted: isPast(rampOutTime),
        coordinates: destination.coordinates,
        dwellHours: 2,
        isHoldGate: false,
        status: isPast(rampOutTime) ? "completed" : "pending",
      });

      // 6. Customs clearance if international rail
      if (isInternational) {
        const cusrTime = interpolateTime(depMs, delMs, 1, -3);
        rawMilestones.push({
          code: "CUSR",
          title: "Cross-Border Rail Customs Cleared",
          description: `Cross-border customs inspection finalized and intermodal release authorized`,
          locationName: `${destination.city || destination.name} Rail Customs Yard`,
          locationCode: destination.code,
          timestamp: cusrTime,
          isCompleted: isPast(cusrTime),
          coordinates: destination.coordinates,
          dwellHours: 8,
          isHoldGate: true,
          status: isPast(cusrTime) ? "completed" : "pending",
        });
      }

      // 7. Final Delivery (FINAL_DLV) - delivery time
      const dlvTime = new Date(delMs).toISOString();
      rawMilestones.push({
        code: "FINAL_DLV",
        title: "Final Drayage Delivery",
        description: `Container drayed from rail terminal and accepted at customer receiving dock`,
        locationName: `${destination.city || destination.name} Consignee Facility`,
        locationCode: destination.code,
        timestamp: dlvTime,
        isCompleted: isPast(dlvTime),
        coordinates: destination.coordinates,
        dwellHours: 0,
        isHoldGate: false,
        status: isPast(dlvTime) ? "completed" : "pending",
      });
      break;
    }

    case "road": {
      // 1. Dispatched from Terminal (DISP) - departure time
      const depTime = new Date(depMs).toISOString();
      rawMilestones.push({
        code: "DISP",
        title: "Dispatched from Freight Terminal",
        description: `Tractor-trailer safety inspected and departed origin logistics terminal (${origin.name})`,
        locationName: origin.name,
        locationCode: origin.code,
        timestamp: depTime,
        isCompleted: isPast(depTime),
        coordinates: origin.coordinates,
        dwellHours: 1,
        isHoldGate: false,
        status: isPast(depTime) ? "completed" : "pending",
      });

      // 2. Highway Corridor Transit (INTR) - 40% into schedule
      const intrTime = interpolateTime(depMs, delMs, 0.4);
      rawMilestones.push({
        code: "INTR",
        title: "In Transit — Commercial Highway Corridor",
        description: `Commercial vehicle in transit through expressway transport corridor`,
        locationName: "Interstate / Commercial Highway Route",
        timestamp: intrTime,
        isCompleted: isPast(intrTime),
        dwellHours: 0,
        isHoldGate: false,
        status: isPast(intrTime) ? "completed" : "pending",
      });

      // 3. Arrived at Regional Freight Hub (ARRI) - 3h before delivery
      const arriTime = interpolateTime(depMs, delMs, 1, -3);
      rawMilestones.push({
        code: "ARRI",
        title: "Arrived at Regional Freight Hub",
        description: `Rig arrived at destination freight depot for final-mile route staging`,
        locationName: destination.name,
        locationCode: destination.code,
        timestamp: arriTime,
        isCompleted: isPast(arriTime),
        coordinates: destination.coordinates,
        dwellHours: 3,
        isHoldGate: false,
        status: isPast(arriTime) ? "completed" : "pending",
      });

      // 4. Customs clearance if international cross-border trucking
      if (isInternational) {
        const cusrTime = interpolateTime(depMs, delMs, 1, -2);
        rawMilestones.push({
          code: "CUSR",
          title: "Cross-Border Commercial Customs Cleared",
          description: `Commercial vehicle cross-border manifest processed and cleared through border customs station`,
          locationName: `${destination.city || destination.name} Border Customs Station`,
          locationCode: destination.code,
          timestamp: cusrTime,
          isCompleted: isPast(cusrTime),
          coordinates: destination.coordinates,
          dwellHours: 6,
          isHoldGate: true,
          status: isPast(cusrTime) ? "completed" : "pending",
        });
      }

      // 5. Out for Final Delivery (OFD) - 1.5h before delivery
      const ofdTime = interpolateTime(depMs, delMs, 1, -1.5);
      rawMilestones.push({
        code: "OFD",
        title: "Out for Final Delivery",
        description: `Shipment loaded onto local delivery tractor for final customer dock delivery`,
        locationName: `${destination.city || destination.name} Metropolitan Delivery Zone`,
        timestamp: ofdTime,
        isCompleted: isPast(ofdTime),
        coordinates: destination.coordinates,
        dwellHours: 1,
        isHoldGate: false,
        status: isPast(ofdTime) ? "completed" : "pending",
      });

      // 6. Delivered (DLV) - delivery time
      const dlvTime = new Date(delMs).toISOString();
      rawMilestones.push({
        code: "DLV",
        title: "Delivered & Consignment Signed",
        description: `Delivery completed and electronic proof of delivery signed by recipient`,
        locationName: `${destination.city || destination.name} Consignee Receiving Dock`,
        locationCode: destination.code,
        timestamp: dlvTime,
        isCompleted: isPast(dlvTime),
        coordinates: destination.coordinates,
        dwellHours: 0,
        isHoldGate: false,
        status: isPast(dlvTime) ? "completed" : "pending",
      });
      break;
    }
  }

  // Strictly enforce chronological monotonicity: timestamp[i] <= timestamp[i+1]
  const sorted = rawMilestones.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  let prevTime = 0;
  for (let i = 0; i < sorted.length; i++) {
    const curTime = new Date(sorted[i].timestamp).getTime();
    if (curTime < prevTime) {
      sorted[i].timestamp = new Date(prevTime).toISOString();
    } else {
      prevTime = curTime;
    }
  }

  // Assign sequential IDs: "ms-1", "ms-2", ...
  return sorted.map((m, index) => ({
    ...m,
    id: `ms-${index + 1}`,
  }));
}
