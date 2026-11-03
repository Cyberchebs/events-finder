import { NextResponse } from "next/server";
import { getPublishedEvents } from "@/lib/events";

export async function GET() {
  try {
    const data = await getPublishedEvents();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("[api/events/discover] event read failed", error);
    return NextResponse.json(
      { success: false, error: "Events could not be loaded." },
      { status: 500 },
    );
  }
}
