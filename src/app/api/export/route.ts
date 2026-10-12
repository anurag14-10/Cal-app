import { NextRequest, NextResponse } from "next/server";
import { getAllCalculations } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const format = request.nextUrl.searchParams.get("format") || "json";
    const data = getAllCalculations();

    if (format === "csv") {
      const header = "ID,Expression,Result,Mode,Favorite,Note,CreatedAt\n";
      const rows = data
        .map((row) =>
          [
            row.id,
            `"${row.expression.replace(/"/g, '""')}"`,
            `"${row.result.replace(/"/g, '""')}"`,
            row.mode,
            row.is_favorite ? "Yes" : "No",
            `"${(row.note || "").replace(/"/g, '""')}"`,
            `"${row.created_at}"`,
          ].join(",")
        )
        .join("\n");

      return new NextResponse(header + rows, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="calc-history-${Date.now()}.csv"`,
        },
      });
    }

    return new NextResponse(JSON.stringify(data, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="calc-history-${Date.now()}.json"`,
      },
    });
  } catch (error) {
    console.error("Failed to export calculations:", error);
    return NextResponse.json({ success: false, error: "Export failed" }, { status: 500 });
  }
}
