import { NextResponse } from "next/server";
import { geocodeAddress } from "@/server/routing/geocoder";
import { matchBimodalGateways } from "@/server/routing/gatewayMatcher";
import { calculateCorridorRoute } from "@/server/routing/corridorEngine";
import { generateMilestones } from "@/server/routing/milestones";
import {
  generatePublicTrackingCode,
  generateConveyanceDefaults,
  generateOceanBL,
  generateAirAWB,
  generateRailCIM,
  generateRoadCMR,
} from "@/server/routing/identifiers";
import type { TransportMode, RouteCalculationResponse } from "@/shared/types";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      mode = "ocean",
      originQuery,
      destQuery,
      originCoords: rawOriginCoords,
      destCoords: rawDestCoords,
      departureDate = new Date().toISOString(),
      estimatedDeliveryDate,
    } = body as {
      mode: TransportMode;
      originQuery?: string;
      destQuery?: string;
      originCoords?: [number, number];
      destCoords?: [number, number];
      departureDate?: string;
      estimatedDeliveryDate?: string;
    };

    // 1. Resolve Origin Coordinates
    let originCoords = rawOriginCoords;
    let originAddress = originQuery || "";
    let originCountry = "US";
    let originCountryCode = "US";
    let originCity = "";

    if (!originCoords || !Array.isArray(originCoords) || originCoords.length !== 2) {
      if (!originQuery || originQuery.trim() === "") {
        return NextResponse.json(
          { success: false, error: "Origin location or coordinates required." },
          { status: 400 }
        );
      }
      const geo = await geocodeAddress(originQuery);
      originCoords = geo.coordinates;
      originAddress = geo.formattedAddress || originQuery;
      originCountry = geo.country || "Unknown";
      originCountryCode = geo.countryCode || "US";
      originCity = geo.city || "";
    }

    // 2. Resolve Destination Coordinates
    let destCoords = rawDestCoords;
    let destAddress = destQuery || "";
    let destCountry = "US";
    let destCountryCode = "US";
    let destCity = "";

    if (!destCoords || !Array.isArray(destCoords) || destCoords.length !== 2) {
      if (!destQuery || destQuery.trim() === "") {
        return NextResponse.json(
          { success: false, error: "Destination location or coordinates required." },
          { status: 400 }
        );
      }
      const geo = await geocodeAddress(destQuery);
      destCoords = geo.coordinates;
      destAddress = geo.formattedAddress || destQuery;
      destCountry = geo.country || "Unknown";
      destCountryCode = geo.countryCode || "US";
      destCity = geo.city || "";
    }

    // 3. Snap Coordinates to Multimodal Gateways
    const bimodal = matchBimodalGateways(originCoords, destCoords, mode);
    const originGateway = bimodal.originGateway.hub;
    const destGateway = bimodal.destGateway.hub;

    // 4. Calculate Corridor Polyline & Passage Waypoints
    const corridor = calculateCorridorRoute(
      originGateway.coordinates,
      destGateway.coordinates,
      mode,
      { originHub: originGateway, destHub: destGateway }
    );

    // 5. Calculate Schedule Defaults
    const depDate = new Date(departureDate);
    const transitHours = corridor.durationHours || 72;
    const estDeliveryDate = estimatedDeliveryDate
      ? new Date(estimatedDeliveryDate).toISOString()
      : new Date(depDate.getTime() + transitHours * 3600 * 1000).toISOString();

    // 6. Generate Logistics Defaults & Authentic Identifiers
    const deltaLng = destCoords[0] - originCoords[0];
    const conveyanceDefaults = generateConveyanceDefaults(
      mode,
      originGateway.countryCode || originCountryCode,
      destGateway.countryCode || destCountryCode,
      departureDate,
      deltaLng
    );

    let consignmentRef = "";
    if (mode === "ocean") consignmentRef = generateOceanBL("RILU");
    else if (mode === "air") consignmentRef = generateAirAWB("180");
    else if (mode === "rail") consignmentRef = generateRailCIM();
    else consignmentRef = generateRoadCMR();

    const trackingCode = generatePublicTrackingCode(destGateway.countryCode || destCountryCode);

    // 7. Generate Sequential Tracking Milestones
    const milestones = generateMilestones({
      mode,
      origin: {
        name: originGateway.name || originAddress,
        code: originGateway.code,
        city: originGateway.city || originCity,
        country: originGateway.country || originCountry,
        countryCode: originGateway.countryCode || originCountryCode,
        coordinates: originGateway.coordinates,
      },
      destination: {
        name: destGateway.name || destAddress,
        code: destGateway.code,
        city: destGateway.city || destCity,
        country: destGateway.country || destCountry,
        countryCode: destGateway.countryCode || destCountryCode,
        coordinates: destGateway.coordinates,
      },
      departureDate: depDate.toISOString(),
      estimatedDeliveryDate: estDeliveryDate,
      passages: corridor.passages,
      conveyanceName: conveyanceDefaults.conveyanceName,
    });

    const logisticsDefaults = {
      ...conveyanceDefaults,
      consignmentReference: consignmentRef,
    };

    const responsePayload = {
      success: true,
      mode,
      distanceKm: corridor.distanceKm,
      distanceNm: corridor.distanceNm,
      durationHours: corridor.durationHours,
      coordinates: corridor.coordinates,
      routeCoordinates: corridor.coordinates,
      waypoints: corridor.waypoints,
      milestones,
      trackingCode,
      carrierTrackingCode: trackingCode,
      trackingNumber: trackingCode,
      conveyanceDefaults: logisticsDefaults,
      logisticsDefaults,
      passages: corridor.passages,
      originGateway,
      destGateway,
    };

    return NextResponse.json(responsePayload);
  } catch (error: any) {
    console.error("Route calculation API error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Internal route calculation failure" },
      { status: 500 }
    );
  }
}
