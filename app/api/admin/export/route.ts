/**
 * GET /api/admin/export?format=csv|json
 *
 * Exporta la actividad de TODOS los workspaces para análisis científico.
 * Protegido por cookie de admin (lib/admin-auth).
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const url = new URL(req.url);
  const format = url.searchParams.get("format") ?? "csv";

  const rows = await prisma.workspaceActivityLog.findMany({
    orderBy: { createdAt: "asc" },
    include: { workspace: true },
  });

  const flat = rows.map((r) => ({
    eventId: r.id,
    workspaceId: r.workspaceId,
    workspaceDisplayName: r.workspace?.displayName ?? "",
    workspaceCreatedAt: r.workspace?.createdAt.toISOString() ?? "",
    eventType: r.eventType,
    eventCreatedAt: r.createdAt.toISOString(),
    payloadJson: r.payloadJson ?? "",
  }));

  const dateLabel = new Date().toISOString().slice(0, 10);

  if (format === "json") {
    return new NextResponse(JSON.stringify({ schemaVersion: "v7.G.I.1", exportedAt: dateLabel, events: flat }, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="emps-actividad-${dateLabel}.json"`,
      },
    });
  }

  // CSV con BOM UTF-8 para Excel
  const headers = Object.keys(flat[0] ?? { eventId: "", workspaceId: "", workspaceDisplayName: "", workspaceCreatedAt: "", eventType: "", eventCreatedAt: "", payloadJson: "" });
  const escape = (v: string) => {
    if (v.includes(",") || v.includes('"') || v.includes("\n") || v.includes("\r")) {
      return `"${v.replace(/"/g, '""')}"`;
    }
    return v;
  };
  const lines = [headers.join(",")];
  for (const r of flat) {
    lines.push(headers.map((h) => escape(String((r as Record<string, unknown>)[h] ?? ""))).join(","));
  }
  const csv = "﻿" + lines.join("\n") + "\n";

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="emps-actividad-${dateLabel}.csv"`,
    },
  });
}
