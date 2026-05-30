/**
 * POST /api/research/analysis/run
 *
 * Corre el motor de validación de hipótesis sobre los datos disponibles:
 * - extrae dataset desde Prisma (Project + Estimate + ProjectActualResult)
 * - calcula estadística descriptiva, correlación, regresión, random forest, MLP
 * - emite veredicto automático (cumplida / parcial / no_cumplida / insuficiente)
 *
 * Protegido por isAdmin(). Acepta query param ?includeSynthetic=true para
 * incluir TrainingCases sintéticos durante desarrollo.
 */
import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { buildAnalysisDataset } from "@/lib/research/dataset-builder";
import { runFullAnalysis } from "@/lib/research/hypothesis-analysis";
import { getCurrentWorkspace, logWorkspaceActivity } from "@/lib/workspace";

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  const includeSynthetic = req.nextUrl.searchParams.get("includeSynthetic") === "true";
  try {
    const rows = await buildAnalysisDataset({ includeSynthetic });
    const result = runFullAnalysis(rows);

    const ws = await getCurrentWorkspace();
    if (ws) {
      await logWorkspaceActivity(ws.id, "research_analysis_run", {
        n: result.n,
        includeSynthetic,
        verdict: result.hypothesis.verdict,
        rSquared: result.hypothesis.rSquared,
      });
    }

    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al ejecutar análisis." },
      { status: 500 },
    );
  }
}
