/**
 * GET /api/research/analysis/report?format=csv|json[&includeSynthetic=true]
 *
 * Descarga el REPORTE DE METRICAS del analisis de hipotesis, etiquetado con los
 * mismos nombres del articulo 1 (MMRE, MdMRE, PRED(15), PRED(30), R2, RMSE,
 * Mann-Whitney). Una fila por metrica, listo para pegar en el articulo.
 *
 * Protegido por isAdmin().
 */
import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { buildAnalysisDataset } from "@/lib/research/dataset-builder";
import { runFullAnalysis, type FullAnalysisResult } from "@/lib/research/hypothesis-analysis";
import { getCurrentWorkspace, logWorkspaceActivity } from "@/lib/workspace";

interface MetricRow {
  seccion: string;
  metrica: string;
  valor: string;
  detalle: string;
}

function buildMetricRows(r: FullAnalysisResult): MetricRow[] {
  const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
  const m = r.metricsSummary;
  const rows: MetricRow[] = [
    { seccion: "muestra", metrica: "N (proyectos con resultado real)", valor: String(r.n), detalle: "casos estimado-vs-real" },
    { seccion: "precision_horas", metrica: "MMRE", valor: m.mmreHours.toFixed(4), detalle: "media del error relativo (horas)" },
    { seccion: "precision_horas", metrica: "MdMRE", valor: m.mdmreHours.toFixed(4), detalle: "mediana del error relativo (horas)" },
    { seccion: "precision_horas", metrica: "PRED(15)", valor: pct(m.pred15), detalle: "proyectos dentro de +/-15% (IFPUG)" },
    { seccion: "precision_horas", metrica: "PRED(30)", valor: pct(m.pred30), detalle: "proyectos dentro de +/-30%" },
    { seccion: "precision_costo", metrica: "MMRE costo", valor: m.mmreCost.toFixed(4), detalle: "media del error relativo (costo)" },
    { seccion: "precision_costo", metrica: "MdMRE costo", valor: m.mdmreCost.toFixed(4), detalle: "mediana del error relativo (costo)" },
    { seccion: "mape", metrica: "MAPE horas medio", valor: `${r.descriptive.mapeHours.mean.toFixed(2)}%`, detalle: "media del error porcentual absoluto" },
    { seccion: "mape", metrica: "MAPE horas mediano", valor: `${r.descriptive.mapeHours.median.toFixed(2)}%`, detalle: "mediana" },
  ];
  if (r.regression) {
    rows.push(
      { seccion: "regresion", metrica: "R2", valor: r.regression.rSquared.toFixed(4), detalle: "varianza del MAPE explicada por las variables tempranas" },
      { seccion: "regresion", metrica: "RMSE", valor: r.regression.rmse.toFixed(4), detalle: "error cuadratico medio de la regresion" },
      { seccion: "regresion", metrica: "intercepto", valor: r.regression.intercept.toFixed(4), detalle: "" },
    );
    for (const c of r.regression.coefficients) {
      rows.push({
        seccion: "regresion_coeficientes",
        metrica: c.feature,
        valor: c.coef.toFixed(4),
        detalle: `p≈${c.pValueApprox.toFixed(3)}${c.pValueApprox < 0.05 ? " (significativo)" : ""}`,
      });
    }
  }
  if (r.classification) {
    rows.push({ seccion: "random_forest", metrica: "accuracy (precisa si/no)", valor: `${(r.classification.accuracy * 100).toFixed(1)}%`, detalle: `train ${r.classification.trainSize}, test ${r.classification.testSize}` });
  }
  if (r.groupComparison) {
    const g = r.groupComparison;
    rows.push(
      { seccion: "mann_whitney", metrica: "U", valor: g.u.toFixed(2), detalle: g.label },
      { seccion: "mann_whitney", metrica: "p (dos colas)", valor: g.pValueApprox.toFixed(4), detalle: g.significant ? "significativo (p<0.05)" : "no significativo" },
      { seccion: "mann_whitney", metrica: "mediana MAPE integral", valor: `${g.medianA.toFixed(2)}%`, detalle: `n=${g.nA}` },
      { seccion: "mann_whitney", metrica: "mediana MAPE simple", valor: `${g.medianB.toFixed(2)}%`, detalle: `n=${g.nB}` },
    );
  }
  rows.push({ seccion: "veredicto", metrica: "hipotesis", valor: r.hypothesis.verdict, detalle: r.hypothesis.reason });
  return rows;
}

function escapeCsv(v: string): string {
  if (v.includes(",") || v.includes('"') || v.includes("\n")) {
    return '"' + v.replace(/"/g, '""') + '"';
  }
  return v;
}

function toCsv(rows: MetricRow[]): string {
  const header = ["seccion", "metrica", "valor", "detalle"];
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push([r.seccion, r.metrica, r.valor, r.detalle].map(escapeCsv).join(","));
  }
  return "﻿" + lines.join("\n");
}

export async function GET(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  const format = (req.nextUrl.searchParams.get("format") ?? "csv").toLowerCase();
  const includeSynthetic = req.nextUrl.searchParams.get("includeSynthetic") === "true";
  const fecha = new Date().toISOString().slice(0, 10);

  try {
    const rows = await buildAnalysisDataset({ includeSynthetic });
    const result = runFullAnalysis(rows);
    const metricRows = buildMetricRows(result);

    const ws = await getCurrentWorkspace();
    if (ws) {
      await logWorkspaceActivity(ws.id, "research_report_exported", {
        n: result.n,
        format,
        verdict: result.hypothesis.verdict,
      });
    }

    if (format === "json") {
      const body = JSON.stringify(
        { generatedAt: result.generatedAt, n: result.n, verdict: result.hypothesis.verdict, metrics: metricRows, full: result },
        null,
        2,
      );
      return new NextResponse(body, {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="emps-reporte-metricas-${fecha}.json"`,
        },
      });
    }

    return new NextResponse(toCsv(metricRows), {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="emps-reporte-metricas-${fecha}.csv"`,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al generar el reporte." },
      { status: 500 },
    );
  }
}
