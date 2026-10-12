import { NextRequest, NextResponse } from "next/server";
import {
  getAllCalculations,
  insertCalculation,
  clearAllCalculations,
} from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || undefined;
    const favoriteOnly = searchParams.get("favoriteOnly") === "true";
    const mode = searchParams.get("mode") || undefined;

    const data = getAllCalculations({ search, favoriteOnly, mode });
    return NextResponse.json({ success: true, calculations: data });
  } catch (error) {
    console.error("Failed to fetch calculation history:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch calculation history" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { expression, result, mode = "standard", note = "" } = body;

    if (!expression || result === undefined || result === null) {
      return NextResponse.json(
        { success: false, error: "Expression and result are required" },
        { status: 400 }
      );
    }

    const record = insertCalculation(
      String(expression),
      String(result),
      mode === "scientific" ? "scientific" : "standard",
      String(note)
    );

    return NextResponse.json({ success: true, calculation: record }, { status: 201 });
  } catch (error) {
    console.error("Failed to save calculation:", error);
    return NextResponse.json(
      { success: false, error: "Failed to save calculation" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    clearAllCalculations();
    return NextResponse.json({ success: true, message: "History cleared" });
  } catch (error) {
    console.error("Failed to clear calculation history:", error);
    return NextResponse.json(
      { success: false, error: "Failed to clear calculation history" },
      { status: 500 }
    );
  }
}
