import { NextResponse } from "next/server";
import {
  TimelineLegError,
  buildTimelineLegs,
  normalizeTimelinePayload,
} from "@/server/routing/timelineLegs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payload = normalizeTimelinePayload(body);
    const result = buildTimelineLegs(payload);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof TimelineLegError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }
    console.error("Timeline leg calculation error:", error);
    return NextResponse.json(
      { success: false, error: "Unable to build timeline route legs." },
      { status: 500 }
    );
  }
}
