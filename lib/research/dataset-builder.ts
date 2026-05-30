/**
 * FASE H — Extractor de dataset analitico desde Prisma.
 *
 * Une Project + Estimate + ProjectActualResult + ChangeRequest + Module
 * para producir filas planas con columnas listas para ML / pandas.
 *
 * Tambien serializa a CSV con headers descriptivos para descarga.
 */
import { prisma } from "@/lib/db";
import { Decimal } from "decimal.js";
import type { AnalysisRow } from "./hypothesis-analysis";

const SYNTHETIC_MARK = "simulated_dev_only";

export interface BuildDatasetOptions {
  /** Si true, incluye TrainingCase con sourceKind=simulated_dev_only. Default: false. */
  includeSynthetic?: boolean;
}

type DecimalLike = Decimal | number | string | null | undefined;

const dec = (v: DecimalLike): number => {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  if (typeof v === "string") return Number(v);
  return v.toNumber();
};

/**
 * Construye dataset analitico desde proyectos reales con resultado capturado.
 * Cada fila = 1 proyecto con su estimate probable + su ProjectActualResult.
 *
 * Nota: ProjectActualResult no tiene back-relation en Project, asi que se
 * hace una query separada y se une por projectId.
 */
export async function buildAnalysisDataset(opts: BuildDatasetOptions = {}): Promise<AnalysisRow[]> {
  const includeSynthetic = opts.includeSynthetic ?? false;

  const [projects, allActualResults] = await Promise.all([
    prisma.project.findMany({
      where: { isTemplate: false },
      include: {
        modules: { select: { complexity: true, clarity: true, criticality: true, integrationsCount: true } },
        estimates: {
          where: { scenario: "probable" },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        changes: { select: { id: true } },
      },
    }),
    prisma.projectActualResult.findMany({}),
  ]);

  const actualByProject = new Map(allActualResults.filter((r) => r.projectId).map((r) => [r.projectId!, r]));

  const rows: AnalysisRow[] = [];

  for (const p of projects) {
    const est = p.estimates[0];
    const actual = actualByProject.get(p.id);
    if (!est || !actual) continue;

    const estHours =
      dec(est.analysisHours) +
      dec(est.designHours) +
      dec(est.codingHours) +
      dec(est.reviewHours) +
      dec(est.testingHours) +
      dec(est.documentationHours) +
      dec(est.deploymentHours) +
      dec(est.trainingHours) +
      dec(est.supportHours) +
      dec(est.hardeningHours);
    const actualHours = dec(actual.actualEffortHours);
    if (actualHours <= 0) continue;

    const estCost = dec(est.total);
    const actualCost = dec(actual.actualTotalCostMxn);

    const mapeHours = (Math.abs(estHours - actualHours) / Math.max(0.0001, actualHours)) * 100;
    const mapeCost = actualCost > 0 ? (Math.abs(estCost - actualCost) / actualCost) * 100 : 0;

    const clarityAvg =
      p.modules.length === 0 ? 3 : p.modules.reduce((a, m) => a + m.clarity, 0) / p.modules.length;
    const criticalityAvg =
      p.modules.length === 0 ? 3 : p.modules.reduce((a, m) => a + m.criticality, 0) / p.modules.length;
    const nIntegrations = p.modules.reduce((a, m) => a + (m.integrationsCount ?? 0), 0);

    // Cambios anticipados: cantidad de ChangeRequest creados antes del cierre
    const anticipated = p.changes.length;
    const actualChanges = actual.actualChangeCount ?? 0;
    const changesAnticipatedRatio =
      actualChanges === 0 ? 1.0 : Math.min(2.0, anticipated / Math.max(1, actualChanges));

    const inputsSnapshot = est.inputsSnapshot ? safeParse(est.inputsSnapshot) : {};
    const fiscalDetailed = (inputsSnapshot as { costMode?: string }).costMode === "detailed";

    rows.push({
      projectId: p.id,
      projectName: p.name,
      devMode: est.mode,
      estHours,
      actualHours,
      estCostMxn: estCost,
      actualCostMxn: actualCost,
      clarityAvg: Number(clarityAvg.toFixed(2)),
      nModules: p.modules.length,
      nIntegrations,
      criticalityAvg: Number(criticalityAvg.toFixed(2)),
      changesAnticipatedRatio: Number(changesAnticipatedRatio.toFixed(2)),
      fiscalDetailed,
      mapeHours: Number(mapeHours.toFixed(2)),
      mapeCost: Number(mapeCost.toFixed(2)),
      isAccurate: mapeHours <= 15,
    });
  }

  if (includeSynthetic) {
    const tcs = await prisma.trainingCase.findMany({
      where: {
        sourceKind: SYNTHETIC_MARK,
        estimatedEffortHours: { gt: 0 },
        actualEffortHours: { gt: 0 },
      },
    });
    for (const tc of tcs) {
      const estH = dec(tc.estimatedEffortHours);
      const actH = dec(tc.actualEffortHours);
      if (actH <= 0) continue;
      const estC = dec(tc.estimatedCostMxn);
      const actC = dec(tc.actualCostMxn);
      const mapeHours = (Math.abs(estH - actH) / Math.max(0.0001, actH)) * 100;
      const mapeCost = actC > 0 ? (Math.abs(estC - actC) / actC) * 100 : 0;
      rows.push({
        projectId: `tc_${tc.id}`,
        projectName: `Caso simulado ${tc.id.slice(0, 6)}${tc.projectType ? ` — ${tc.projectType}` : ""}`,
        devMode: tc.devModeCode ?? "traditional",
        estHours: estH,
        actualHours: actH,
        estCostMxn: estC,
        actualCostMxn: actC,
        clarityAvg: dec(tc.requirementsClarity) / 20,
        nModules: tc.moduleCount ?? 1,
        nIntegrations: tc.integrationCount ?? 0,
        criticalityAvg: 3,
        changesAnticipatedRatio: 1.0,
        fiscalDetailed: true,
        mapeHours: Number(mapeHours.toFixed(2)),
        mapeCost: Number(mapeCost.toFixed(2)),
        isAccurate: mapeHours <= 15,
      });
    }
  }

  return rows;
}

function safeParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}

// ============================================================
// Serializacion a CSV con headers descriptivos
// ============================================================

const CSV_COLUMNS: Array<{ header: string; key: keyof AnalysisRow; format?: (v: unknown) => string }> = [
  { header: "project_id", key: "projectId" },
  { header: "project_name", key: "projectName" },
  { header: "dev_mode", key: "devMode" },
  { header: "est_hours", key: "estHours" },
  { header: "actual_hours", key: "actualHours" },
  { header: "est_cost_mxn", key: "estCostMxn" },
  { header: "actual_cost_mxn", key: "actualCostMxn" },
  { header: "clarity_avg", key: "clarityAvg" },
  { header: "n_modules", key: "nModules" },
  { header: "n_integrations", key: "nIntegrations" },
  { header: "criticality_avg", key: "criticalityAvg" },
  { header: "changes_anticipated_ratio", key: "changesAnticipatedRatio" },
  { header: "fiscal_detailed", key: "fiscalDetailed", format: (v) => (v ? "1" : "0") },
  { header: "mape_hours", key: "mapeHours" },
  { header: "mape_cost", key: "mapeCost" },
  { header: "is_accurate_15pct", key: "isAccurate", format: (v) => (v ? "1" : "0") },
];

function escapeCsv(v: unknown): string {
  if (v == null) return "";
  const s = String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

export function serializeToCsv(rows: AnalysisRow[]): string {
  const lines = [CSV_COLUMNS.map((c) => c.header).join(",")];
  for (const row of rows) {
    const cells = CSV_COLUMNS.map((c) => {
      const raw = row[c.key];
      return escapeCsv(c.format ? c.format(raw) : raw);
    });
    lines.push(cells.join(","));
  }
  // BOM UTF-8 para que Excel abra acentos correctamente
  return "﻿" + lines.join("\n");
}

export function serializeToJson(rows: AnalysisRow[]): string {
  return JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      schemaVersion: "1.0",
      n: rows.length,
      columns: CSV_COLUMNS.map((c) => c.header),
      rows,
    },
    null,
    2,
  );
}

export { CSV_COLUMNS };
