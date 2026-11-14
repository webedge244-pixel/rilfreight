import { NextResponse } from "next/server";
import { getShipmentByTrackingCode, updateShipmentRecord } from "@/shared/lib/firebase";
import { evaluateShipmentProgression } from "@/features/tracking/services/trackingService";

export async function POST(request: Request) {
  try {
    const { code } = (await request.json()) as { code?: string };
    if (!code) {
      return NextResponse.json(
        { success: false, message: "Missing tracking code" },
        { status: 400 }
      );
    }

    const shipment = await getShipmentByTrackingCode(code);
    if (!shipment) {
      return NextResponse.json(
        { success: false, message: "Shipment not found" },
        { status: 404 }
      );
    }

    // Evaluate strictly using Server UTC atomic time
    const { updatedShipment, hasChanged } = evaluateShipmentProgression(
      shipment,
      Date.now()
    );

    if (hasChanged) {
      await updateShipmentRecord(updatedShipment.id, {
        milestones: updatedShipment.milestones,
        status: updatedShipment.status,
      });
    }

    return NextResponse.json({ success: true, updated: hasChanged });
  } catch (error) {
    console.error("Auto-sync error:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
