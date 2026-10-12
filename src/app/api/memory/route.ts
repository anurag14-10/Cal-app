import { NextRequest, NextResponse } from "next/server";
import { getMemory, setMemory } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const slot = request.nextUrl.searchParams.get("slot") || "M";
    const value = getMemory(slot);
    return NextResponse.json({ success: true, slot, value });
  } catch (error) {
    console.error("Failed to read memory slot:", error);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const slot = body.slot || "M";
    const value = Number(body.value);

    if (isNaN(value)) {
      return NextResponse.json({ success: false, error: "Invalid value" }, { status: 400 });
    }

    setMemory(slot, value);
    return NextResponse.json({ success: true, slot, value });
  } catch (error) {
    console.error("Failed to update memory slot:", error);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
