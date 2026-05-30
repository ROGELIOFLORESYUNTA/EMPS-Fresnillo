/**
 * GET /api/research/dataset?format=csv|json[&includeSynthetic=true]
 *
 * Descarga el dataset analítico (Project + Estimate + ProjectActualResult)
 * en CSV o JSON con columnas documentadas y listas para pandas/scikit-learn.
 *
 * Protegido por isAdmin().
 */
import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { buildAnalysisDataset, serializeToCsv, serializeToJson } from "@/lib/research/dataset-builder";

export async function GET(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  const format = (req.nextUrl.searchParams.get("format") ?? "csv").toLowerCase();
  const includeSynthetic = req.nextUrl.searchParams.get("includeSynthetic") === "true";
  const rows = await buildAnalysisDataset({ includeSynthetic });
  const fecha = new Date().toISOString().slice(0, 10);

  if (format === "json") {
    return new NextResponse(serializeToJson(rows), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="emps-dataset-${fecha}.json"`,
      },
    });
  }
  return new NextResponse(serializeToCsv(rows), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="emps-dataset-${fecha}.csv"`,
    },
  });
}
