import { NextResponse } from "next/server";
import { getStats } from "@/lib/db";

export async function GET() {
  try {
    const stats = getStats();
    return NextResponse.json({ success: true, stats });
  } catch (error) {
    console.error("Failed to fetch stats:", error);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
