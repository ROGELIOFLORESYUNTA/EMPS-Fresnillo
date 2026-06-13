/**
 * GET /api/feedback/export?format=csv|json
 *
 * Descarga todo el feedback cualitativo de estimaciones (EstimationFeedback)
 * como evidencia para la tesis. Una fila por comentario.
 *
 * Protegido por isAdmin().
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/admin-auth";

function escapeCsv(v: unknown): string {
  if (v == null) return "";
  const s = String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

export async function GET(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  const format = (req.nextUrl.searchParams.get("format") ?? "csv").toLowerCase();
  const fecha = new Date().toISOString().slice(0, 10);

  // EstimationFeedback no tiene relación con Estimate (solo estimateId),
  // así que cargamos las estimaciones referidas aparte y unimos por id.
  const feedback = await prisma.estimationFeedback.findMany({
    orderBy: { createdAt: "desc" },
  });
  const estimateIds = [...new Set(feedback.map((f) => f.estimateId).filter((v): v is string => !!v))];
  const estimates = estimateIds.length
    ? await prisma.estimate.findMany({
        where: { id: { in: estimateIds } },
        include: { project: { select: { name: true, client: true } } },
      })
    : [];
  const estById = new Map(estimates.map((e) => [e.id, e]));

  const rows = feedback.map((f) => {
    const est = f.estimateId ? estById.get(f.estimateId) : undefined;
    return {
      feedback_id: f.id,
      fecha: f.createdAt.toISOString(),
      proyecto: est?.project?.name ?? "",
      cliente: est?.project?.client ?? "",
      estimate_id: f.estimateId ?? "",
      modo: est?.mode ?? "",
      escenario: est?.scenario ?? "",
      version: est?.version ?? "",
      rol_revisor: f.reviewerRole ?? "",
      tipo: f.feedbackType ?? "",
      severidad: f.severity,
      comentario: f.feedbackText,
    };
  });

  if (format === "json") {
    return new NextResponse(JSON.stringify({ generatedAt: new Date().toISOString(), n: rows.length, rows }, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="emps-feedback-${fecha}.json"`,
      },
    });
  }

  const headers = Object.keys(rows[0] ?? {
    feedback_id: "", fecha: "", proyecto: "", cliente: "", estimate_id: "",
    modo: "", escenario: "", version: "", rol_revisor: "", tipo: "", severidad: "", comentario: "",
  });
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(headers.map((h) => escapeCsv((r as Record<string, unknown>)[h])).join(","));
  }
  const csv = "﻿" + lines.join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="emps-feedback-${fecha}.csv"`,
    },
  });
}
