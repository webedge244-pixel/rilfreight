import { NextResponse } from "next/server";
import { markUserConnected } from "@/shared/lib/firebase";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { uid } = body as { uid?: string };

    if (!uid || typeof uid !== "string") {
      return NextResponse.json(
        { success: false, message: "Missing or invalid uid" },
        { status: 400 }
      );
    }

    await markUserConnected(uid);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("API /api/tracking/connect error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to mark user connected" },
      { status: 500 }
    );
  }
}
