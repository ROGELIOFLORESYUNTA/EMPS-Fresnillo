/**
 * Motor de estimación de cambios (Addendum v6).
 *
 * Calcula el impacto en horas / costo / días / riesgo de una solicitud de cambio,
 * usando una fórmula compuesta: artefactos × claridad × fase × riesgo × modo + contingencia.
 *
 * Validación contra estándares (mayo 2026):
 *  - PMBOK 7: contingencia 10-25% real (corregido del original 5-20%).
 *  - IFPUG / COSMIC: pesos de artefactos compatibles (ratio integración/pantalla ~4×, agresivo
 *    pero defensible al incluir handshake, pruebas y contratos con terceros).
 *  - Boehm/McConnell + Mountain Goat 2014: curva de fase 0.7→3.0 (4.3× spread) reflecting
 *    la curva moderna aplanada por CI/CD y agile.
 *  - Forrester Wave Low-Code 2025: 0.62×–0.68× plausible para happy-path; cambios complejos en
 *    low-code pueden COSTAR MÁS que tradicional. El piso 0.90 + penalización aditiva atrapa
 *    ese caso (un cambio low-code en alto riesgo se penaliza hacia tradicional, no se descuenta).
 *  - ITIL 4: el sistema separa cambios que requieren aprobación formal vs. los que no, en línea
 *    con la clasificación standard/normal/emergency.
 *
 * Fuente: 26_addendum_srs_control_cambios.md, 27_addendum_sds_motor_control_cambios.md.
 */

import type {
  ChangeImpactInput,
  ChangeImpactResult,
  ChangeImpactBreakdown,
  ChangeType,
  ChangeRiskLevel,
} from "./change-types";
import { buildClarificationQuestions } from "./change-questions";

// ====== Parámetros del motor (mover a Parameter table cuando se cargue 31_seed_*.json) ======

const ARTIFACT_WEIGHTS = {
  uiScreens: 6,
  apiEndpoints: 8,
  businessRules: 10,
  databaseTables: 14,
  reports: 10,
  rolesPermissions: 12,
  externalIntegrations: 24,
  dataMigrationObjects: 18,
  automatedTests: 4,
  manualTestScenarios: 3,
  documentsOrTrainingItems: 2,
} as const;

const CLARITY_FACTOR: Record<1 | 2 | 3 | 4 | 5, number> = {
  1: 1.6,
  2: 1.35,
  3: 1.15,
  4: 1.05,
  5: 1.0,
};

const PHASE_FACTOR = {
  before_baseline: 0.7,
  after_baseline: 1.0,
  in_development: 1.35,
  after_integration: 1.7,
  after_testing: 2.2,
  after_acceptance: 2.6,
  in_production: 3.0,
} as const;

const MODE_FACTOR = {
  traditional: 1.0,
  ai_assisted: 0.88,
  hybrid: 0.78,
  bytecoding_prompts: 0.68,
  low_code: 0.62,
} as const;

const HIGH_RISK_MODE_FLOOR = 0.9;

/**
 * Contingencia AJUSTADA según investigación PMBOK 7 (10-25%, no 5-20%).
 * 5% para corrección/garantía solo se justifica si está pre-aprobada (ITIL "standard").
 */
const CONTINGENCY_BY_TYPE: Record<ChangeType, number> = {
  correccion: 0.1, // antes 0.05 — subimos por riesgo de regresión
  garantia: 0.1,
  ajuste_menor: 0.12,
  mejora: 0.15,
  nuevo_alcance: 0.2,
  cambio_estructural: 0.25, // antes 0.20 — alineado a PMI rango complejo
};

// Optimista/conservador como ±25% sobre probable (consistente con scenario_factors del proyecto)
const OPTIMISTIC_FACTOR = 0.85;
const CONSERVATIVE_BASE = 1.25;

// Tarifa por hora referencia para costo si no se entrega (MXN). El servicio inyectará la real.
const DEFAULT_HOURLY_RATE_MXN = 500;

// ====== Helpers ======

function isHighRiskChange(input: ChangeImpactInput): boolean {
  return (
    input.securityImpact >= 2 ||
    input.dataImpact >= 2 ||
    input.integrationImpact >= 2
  );
}

function applyModeFloor(modeFactor: number, highRisk: boolean): number {
  return highRisk ? Math.max(modeFactor, HIGH_RISK_MODE_FLOOR) : modeFactor;
}

function computeArtifactPoints(a: ChangeImpactInput["affectedArtifacts"]): number {
  return (
    a.uiScreens * ARTIFACT_WEIGHTS.uiScreens +
    a.apiEndpoints * ARTIFACT_WEIGHTS.apiEndpoints +
    a.businessRules * ARTIFACT_WEIGHTS.businessRules +
    a.databaseTables * ARTIFACT_WEIGHTS.databaseTables +
    a.reports * ARTIFACT_WEIGHTS.reports +
    a.rolesPermissions * ARTIFACT_WEIGHTS.rolesPermissions +
    a.externalIntegrations * ARTIFACT_WEIGHTS.externalIntegrations +
    a.dataMigrationObjects * ARTIFACT_WEIGHTS.dataMigrationObjects +
    a.automatedTests * ARTIFACT_WEIGHTS.automatedTests +
    a.manualTestScenarios * ARTIFACT_WEIGHTS.manualTestScenarios +
    a.documentsOrTrainingItems * ARTIFACT_WEIGHTS.documentsOrTrainingItems
  );
}

/**
 * Sugiere el tipo de cambio basándose en los artefactos afectados y el contexto.
 * Heurística:
 *   - DB + integración + seguridad alta → cambio_estructural
 *   - DB + roles/permisos + reportes → nuevo_alcance
 *   - múltiples reglas de negocio → mejora
 *   - cambios pequeños después de pruebas → ajuste_menor / correccion
 *   - bug en producción declarado → garantia
 */
function suggestType(input: ChangeImpactInput, points: number): ChangeType {
  const a = input.affectedArtifacts;
  const highRisk = isHighRiskChange(input);
  const touchesStructural = a.databaseTables > 0 && (a.externalIntegrations > 0 || input.securityImpact >= 2);

  if (touchesStructural || points > 200) return "cambio_estructural";
  if (a.databaseTables > 0 || a.externalIntegrations > 0 || a.rolesPermissions > 0) return "nuevo_alcance";
  if (a.businessRules >= 2 || a.reports >= 1 || a.uiScreens >= 2) return "mejora";

  if (input.currentPhase === "in_production") {
    return highRisk ? "nuevo_alcance" : "garantia";
  }
  return points <= 30 ? "correccion" : "ajuste_menor";
}

function computeRiskLevel(
  baseHours: number,
  highRisk: boolean,
  phase: ChangeImpactInput["currentPhase"],
  type: ChangeType,
): ChangeRiskLevel {
  const tardio = phase === "after_testing" || phase === "after_acceptance" || phase === "in_production";
  if (type === "cambio_estructural") return "critico";
  if (highRisk && tardio) return "critico";
  if (highRisk || tardio) return "alto";
  if (baseHours > 80) return "alto";
  if (baseHours > 30) return "medio";
  return "bajo";
}

function buildExplanation(
  input: ChangeImpactInput,
  br: ChangeImpactBreakdown,
  type: ChangeType,
  highRisk: boolean,
): string[] {
  const out: string[] = [];
  const a = input.affectedArtifacts;
  const tardio = input.currentPhase === "after_testing" || input.currentPhase === "after_acceptance" || input.currentPhase === "in_production";

  // Contexto del cambio
  const partes: string[] = [];
  if (a.uiScreens > 0) partes.push(`${a.uiScreens} pantalla${a.uiScreens > 1 ? "s" : ""}`);
  if (a.databaseTables > 0) partes.push("base de datos");
  if (a.rolesPermissions > 0) partes.push("permisos");
  if (a.reports > 0) partes.push("reportes");
  if (a.externalIntegrations > 0) partes.push("integración externa");
  if (partes.length > 0) {
    out.push(`El cambio afecta: ${partes.join(", ")}.`);
  }

  if (input.clarityLevel <= 2) {
    out.push("La solicitud es vaga: el sistema agregó preguntas de aclaración antes de aceptar.");
  }

  if (tardio) {
    out.push(`Se solicita en fase ${input.currentPhase.replace(/_/g, " ")}: aumenta retrabajo, pruebas y aceptación (factor ${br.phaseFactor}×).`);
  }

  if (highRisk && (input.developmentMode === "low_code" || input.developmentMode === "bytecoding_prompts")) {
    out.push(`Aunque el modo es ${input.developmentMode.replace(/_/g, " ")}, el alto riesgo en seguridad/datos/integración hace que NO se aplique el descuento completo del modo (piso ${HIGH_RISK_MODE_FLOOR}×).`);
  } else if (input.developmentMode === "low_code" || input.developmentMode === "bytecoding_prompts") {
    out.push(`El modo ${input.developmentMode.replace(/_/g, " ")} reduce horas de codificación, pero NO elimina pruebas ni aceptación.`);
  }

  if (type === "cambio_estructural") {
    out.push("Es un cambio estructural: requiere aprobación formal y nueva línea base.");
  } else if (type === "nuevo_alcance") {
    out.push("Es un nuevo alcance: aumenta el contrato — debe cotizarse aparte y autorizarse formalmente.");
  } else if (type === "garantia") {
    out.push("Se clasifica como garantía: lo cubre el proveedor sin costo adicional al cliente, salvo que se identifique como nuevo alcance.");
  }

  return out;
}

// ====== Función principal ======

export function computeChangeImpact(input: ChangeImpactInput): ChangeImpactResult {
  const highRisk = isHighRiskChange(input);

  const artifactPoints = computeArtifactPoints(input.affectedArtifacts);
  const clarityFactor = CLARITY_FACTOR[input.clarityLevel];
  const phaseFactor = PHASE_FACTOR[input.currentPhase];
  const modeFactorRaw = MODE_FACTOR[input.developmentMode];
  const modeFactor = applyModeFloor(modeFactorRaw, highRisk);

  // Penalización aditiva al riskFactor cuando el modo es low-code/bytecoding Y hay alto riesgo:
  // refleja que cambios complejos en low-code pueden costar 50-200% más (Forrester 2025).
  const riskBase =
    1 +
    input.securityImpact * 0.08 +
    input.dataImpact * 0.07 +
    input.integrationImpact * 0.1 +
    input.clientAvailabilityRisk;
  const riskPenaltyByMode =
    highRisk && (input.developmentMode === "low_code" || input.developmentMode === "bytecoding_prompts")
      ? 0.15
      : 0;
  const riskFactor = riskBase + riskPenaltyByMode;

  const baseHours = artifactPoints * clarityFactor * phaseFactor * riskFactor * modeFactor;

  const suggestedType = suggestType(input, artifactPoints);
  const contingencyType = input.requestedType ?? suggestedType;
  const contingencyRate = CONTINGENCY_BY_TYPE[contingencyType];
  const contingencyHours = baseHours * contingencyRate;
  const probableHours = baseHours + contingencyHours;

  const optimisticHours = probableHours * OPTIMISTIC_FACTOR;
  // Conservador escala con la incertidumbre acumulada (claridad baja → más conservador)
  const conservativeMultiplier = CONSERVATIVE_BASE + (clarityFactor - 1) * 0.3;
  const conservativeHours = probableHours * conservativeMultiplier;

  const riskLevel = computeRiskLevel(baseHours, highRisk, input.currentPhase, suggestedType);

  const requiresFormalApproval =
    suggestedType === "cambio_estructural" ||
    suggestedType === "nuevo_alcance" ||
    riskLevel === "alto" ||
    riskLevel === "critico";

  const requiresNewBaseline =
    suggestedType === "cambio_estructural" ||
    (suggestedType === "nuevo_alcance" && (input.affectedArtifacts.databaseTables > 0 || input.affectedArtifacts.externalIntegrations > 0));

  const calendarImpactDays = Math.ceil(probableHours / 8); // 1 persona-día = 8h
  const costImpact = probableHours * DEFAULT_HOURLY_RATE_MXN;

  const breakdown: ChangeImpactBreakdown = {
    artifactPoints,
    clarityFactor,
    phaseFactor,
    riskFactor,
    modeFactor: modeFactorRaw,
    modeFactorAdjusted: modeFactor,
    appliedFloor: highRisk && modeFactor !== modeFactorRaw,
    appliedRiskPenalty: riskPenaltyByMode > 0,
    baseHours,
    contingencyRate,
    contingencyHours,
    estimatedHours: probableHours,
  };

  const explanation = buildExplanation(input, breakdown, suggestedType, highRisk);
  const questionsToClarify = buildClarificationQuestions(input);

  return {
    suggestedType,
    contingencyType,
    optimisticHours,
    probableHours,
    conservativeHours,
    estimatedHours: probableHours,
    costImpact,
    hourlyRateUsed: DEFAULT_HOURLY_RATE_MXN,
    calendarImpactDays,
    riskLevel,
    requiresNewBaseline,
    requiresFormalApproval,
    explanation,
    questionsToClarify,
    breakdown,
  };
}

export {
  ARTIFACT_WEIGHTS,
  CLARITY_FACTOR,
  PHASE_FACTOR,
  MODE_FACTOR,
  CONTINGENCY_BY_TYPE,
  HIGH_RISK_MODE_FLOOR,
};
