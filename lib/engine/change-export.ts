/**
 * Serialización de cambios + evaluaciones de impacto para exportación
 * (evidencia académica del artículo). Helpers puros sin I/O.
 */

export interface ChangeExportRow {
  projectId: string;
  projectName: string;
  projectClient: string;
  changeRequestId: string;
  originalText: string;
  requesterName: string;
  changeType: string;
  changeDecision: string;
  changeDecidedBy: string | null;
  changeDecidedAt: string | null;
  assessmentId: string | null;
  assessmentSuggestedType: string | null;
  assessmentFinalType: string | null;
  assessmentCurrentPhase: string | null;
  assessmentDevelopmentMode: string | null;
  assessmentClarityLevel: number | null;
  assessmentUrgencyLevel: number | null;
  assessmentArtifactPoints: number | null;
  assessmentClarityFactor: number | null;
  assessmentPhaseFactor: number | null;
  assessmentModeFactor: number | null;
  assessmentRiskFactor: number | null;
  assessmentContingencyRate: number | null;
  assessmentProbableHours: number | null;
  assessmentOptimisticHours: number | null;
  assessmentConservativeHours: number | null;
  assessmentEstimatedCost: number | null;
  assessmentCalendarImpactDays: number | null;
  assessmentRiskLevel: string | null;
  assessmentRequiresNewBaseline: boolean | null;
  assessmentRequiresFormalApproval: boolean | null;
  assessmentMaintenanceImpactMonthly: number | null;
  assessmentMinimumChargeApplied: boolean | null;
  assessmentFreeChangeGuardrailReason: string | null;
  assessmentBaselineBeforeVersion: number | null;
  assessmentBaselineAfterVersion: number | null;
  assessmentSourceParameterKeys: string;
  assessmentLastParameterReviewAt: string | null;
  assessmentCreatedAt: string | null;
  exportedAt: string;
}

export function serializeChangesToJson(rows: ChangeExportRow[], exportedAt: string): string {
  return JSON.stringify(
    {
      schemaVersion: "v7.0",
      exportedAt,
      count: rows.length,
      changes: rows,
    },
    null,
    2,
  );
}

/**
 * Convierte filas a CSV con escape robusto (RFC 4180): comillas dobles,
 * commas, saltos de línea. Encoding UTF-8 con BOM para que Excel lo abra
 * con acentos correctos.
 */
export function serializeChangesToCsv(rows: ChangeExportRow[]): string {
  if (rows.length === 0) return "﻿\n";
  const headers = Object.keys(rows[0]) as (keyof ChangeExportRow)[];
  const lines: string[] = [];
  lines.push(headers.join(","));
  for (const r of rows) {
    const cells = headers.map((h) => escapeCsvCell(r[h]));
    lines.push(cells.join(","));
  }
  // UTF-8 BOM al inicio para que Excel detecte acentos correctamente
  return "﻿" + lines.join("\n") + "\n";
}

function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = typeof value === "string" ? value : String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
