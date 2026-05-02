/**
 * Riesgo agregado (07_motor_formulas.md §9).
 */
import type { ProjectInput, RiskBreakdown } from "./types";

export interface RiskContext {
  workingCapitalRequired: number;
  capitalDeclaredByProvider: number;
  marginPct: number;
  isnUazRate: number;     // tipico ~0.0385
  fiscalIvaRate: number;  // tipico 0.16
}

export function computeRisk(project: ProjectInput, ctx: RiskContext): RiskBreakdown {
  const avgClarity =
    project.modules.reduce((a, m) => a + m.clarity, 0) / Math.max(1, project.modules.length);
  const avgComplexity =
    project.modules.reduce((a, m) => a + m.complexity, 0) / Math.max(1, project.modules.length);
  const hasSensitive = project.modules.some((m) => m.sensitiveData);

  const technical = clamp01(
    avgComplexity / 5 +
      project.externalIntegrationsCount * 0.1 +
      (project.dataMigration ? 0.2 : 0) +
      (hasSensitive ? 0.2 : 0),
  );

  const requirements = clamp01((5 - avgClarity) / 4 + project.clientUnavailability * 0.5);

  const fiscal = clamp01(
    (ctx.marginPct < 0.15 ? 0.5 : 0) +
      (ctx.fiscalIvaRate < 0.16 || ctx.fiscalIvaRate > 0.16 ? 0.1 : 0) +
      (ctx.isnUazRate > 0.04 ? 0.2 : 0.05),
  );

  const cashFlow = clamp01(
    ctx.workingCapitalRequired > 0
      ? Math.min(1, ctx.workingCapitalRequired / Math.max(1, ctx.capitalDeclaredByProvider))
      : 0,
  );

  const change = clamp01(project.changeProbability * 1.2 + project.turnoverRisk * 0.5);

  const total = technical + requirements + fiscal + cashFlow + change;
  return {
    technical,
    requirements,
    fiscal,
    cashFlow,
    change,
    total,
    level: levelFromScore(total),
  };
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function levelFromScore(score: number): "bajo" | "medio" | "alto" | "critico" {
  if (score < 1.5) return "bajo";
  if (score < 3.0) return "medio";
  if (score < 4.0) return "alto";
  return "critico";
}
