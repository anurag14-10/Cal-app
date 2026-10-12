import { NextRequest, NextResponse } from "next/server";
import { toggleFavorite, updateNote, deleteCalculation } from "@/lib/db";

export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return NextResponse.json({ success: false, error: "Invalid ID" }, { status: 400 });
    }

    const body = await request.json();
    let updated;

    if (body.action === "toggle_favorite") {
      updated = toggleFavorite(id);
    } else if (body.note !== undefined) {
      updated = updateNote(id, String(body.note));
    }

    if (!updated) {
      return NextResponse.json({ success: false, error: "Item not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, calculation: updated });
  } catch (error) {
    console.error("Failed to update calculation:", error);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return NextResponse.json({ success: false, error: "Invalid ID" }, { status: 400 });
    }

    const deleted = deleteCalculation(id);
    if (!deleted) {
      return NextResponse.json({ success: false, error: "Item not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Deleted" });
  } catch (error) {
    console.error("Failed to delete calculation:", error);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
