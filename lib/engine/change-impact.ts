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
  ChangeImpactParameters,
  ChangeFinancialBreakdown,
  AffectedArtifactInput,
} from "./change-types";
import { buildClarificationQuestions } from "./change-questions";

// ====== Parámetros DEFAULT del motor (fallback si la tabla Parameter no los tiene) ======
// v7: el motor ahora acepta params: ChangeImpactParameters como segundo argumento opcional.
// Si se omite, usa DEFAULT_CHANGE_PARAMETERS. Esto mantiene compatibilidad con los 9 tests
// del v6 y permite que el endpoint cargue valores frescos desde DB.

const DEFAULT_ARTIFACT_WEIGHTS: Record<keyof AffectedArtifactInput, number> = {
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
};

const DEFAULT_CLARITY_FACTOR: Record<1 | 2 | 3 | 4 | 5, number> = {
  1: 1.6,
  2: 1.35,
  3: 1.15,
  4: 1.05,
  5: 1.0,
};

const DEFAULT_PHASE_FACTOR = {
  before_baseline: 0.7,
  after_baseline: 1.0,
  in_development: 1.35,
  after_integration: 1.7,
  after_testing: 2.2,
  after_acceptance: 2.6,
  in_production: 3.0,
} as const;

const DEFAULT_MODE_FACTOR = {
  traditional: 1.0,
  ai_assisted: 0.88,
  hybrid: 0.78,
  bytecoding_prompts: 0.68,
  low_code: 0.62,
} as const;

const DEFAULT_HIGH_RISK_MODE_FLOOR = 0.9;

/**
 * Contingencia AJUSTADA según investigación PMBOK 7 (10-25%, no 5-20%).
 * 5% para corrección/garantía solo se justifica si está pre-aprobada (ITIL "standard").
 */
const DEFAULT_CONTINGENCY_BY_TYPE: Record<ChangeType, number> = {
  correccion: 0.1,
  garantia: 0.1,
  ajuste_menor: 0.12,
  mejora: 0.15,
  nuevo_alcance: 0.2,
  cambio_estructural: 0.25,
};

// === v7: nuevos parámetros fiscales/laborales ===

/** % del subtotal que se suma al mantenimiento mensual según riesgo del cambio. */
const DEFAULT_MAINTENANCE_RATE_BY_RISK: Record<ChangeRiskLevel, number> = {
  bajo: 0.005,
  medio: 0.01,
  alto: 0.015,
  critico: 0.02,
};

/** Costo mínimo en MXN: evita cobrar nada por un cambio. */
const DEFAULT_MINIMUM_CHARGE_MXN = 2500;

/** Tarifa por hora default si no se entrega. */
const DEFAULT_HOURLY_RATE_MXN = 500;

/** Tope debajo del cual se puede aceptar "incluido sin costo" sin guardrail. */
const DEFAULT_FREE_CHANGE_LIMIT_MXN = 10000;

/**
 * Tasas fiscales mexicanas 2026 usadas para el desglose financiero.
 * Si se quieren actualizar, vienen del Parameter table principal.
 */
const FISCAL_RATES_FALLBACK = {
  iva: 0.16,
  imssPatronalApprox: 0.265, // ~26.5% promedio EyM + IV + RT + retiro + CEAV + INFONAVIT + guarderías
  isnZacatecasEffective: 0.0385, // ISN 3.5% × (1 + UAZ 10%)
  adminOverheadPct: 0.10, // 10% para gastos administrativos del proveedor
};

// Optimista/conservador como ±25% sobre probable (consistente con scenario_factors del proyecto)
const OPTIMISTIC_FACTOR = 0.85;
const CONSERVATIVE_BASE = 1.25;

/**
 * Parámetros DEFAULT del motor. Se usa cuando el llamador no pasa argumento.
 * Mantiene compatibilidad con los tests v6.
 */
export const DEFAULT_CHANGE_PARAMETERS: ChangeImpactParameters = {
  artifactWeights: DEFAULT_ARTIFACT_WEIGHTS,
  clarityFactor: DEFAULT_CLARITY_FACTOR,
  phaseFactor: DEFAULT_PHASE_FACTOR,
  modeFactor: DEFAULT_MODE_FACTOR,
  contingencyByType: DEFAULT_CONTINGENCY_BY_TYPE,
  highRiskModeFloor: DEFAULT_HIGH_RISK_MODE_FLOOR,
  minimumChargeMxn: DEFAULT_MINIMUM_CHARGE_MXN,
  hourlyRateDefaultMxn: DEFAULT_HOURLY_RATE_MXN,
  freeChangeLimitMxn: DEFAULT_FREE_CHANGE_LIMIT_MXN,
  maintenanceRateByRisk: DEFAULT_MAINTENANCE_RATE_BY_RISK,
  loadedKeys: [],
  fallbackWarnings: [
    "Usando todos los parámetros default (no se invocó loadChangeImpactParameters)",
  ],
  loadedAt: "1970-01-01T00:00:00.000Z",
};

// Aliases para retrocompatibilidad con código que importa los nombres v6:
const ARTIFACT_WEIGHTS = DEFAULT_ARTIFACT_WEIGHTS;
const CLARITY_FACTOR = DEFAULT_CLARITY_FACTOR;
const PHASE_FACTOR = DEFAULT_PHASE_FACTOR;
const MODE_FACTOR = DEFAULT_MODE_FACTOR;
const CONTINGENCY_BY_TYPE = DEFAULT_CONTINGENCY_BY_TYPE;
const HIGH_RISK_MODE_FLOOR = DEFAULT_HIGH_RISK_MODE_FLOOR;

// ====== Helpers ======

function isHighRiskChange(input: ChangeImpactInput): boolean {
  return (
    input.securityImpact >= 2 ||
    input.dataImpact >= 2 ||
    input.integrationImpact >= 2
  );
}

function applyModeFloor(modeFactor: number, highRisk: boolean, floor: number): number {
  return highRisk ? Math.max(modeFactor, floor) : modeFactor;
}

function computeArtifactPoints(
  a: ChangeImpactInput["affectedArtifacts"],
  weights: Record<keyof AffectedArtifactInput, number>,
): number {
  return (
    a.uiScreens * weights.uiScreens +
    a.apiEndpoints * weights.apiEndpoints +
    a.businessRules * weights.businessRules +
    a.databaseTables * weights.databaseTables +
    a.reports * weights.reports +
    a.rolesPermissions * weights.rolesPermissions +
    a.externalIntegrations * weights.externalIntegrations +
    a.dataMigrationObjects * weights.dataMigrationObjects +
    a.automatedTests * weights.automatedTests +
    a.manualTestScenarios * weights.manualTestScenarios +
    a.documentsOrTrainingItems * weights.documentsOrTrainingItems
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

// ====== Funciones puras v7 (financiero, mantenimiento, explicaciones, guardrails) ======

/**
 * Desglose financiero del cambio (v7).
 * laborCost = subtotal sin overhead; sobre éste se calculan IMSS, ISN, admin.
 */
export function computeFinancialBreakdown(
  probableHours: number,
  hourlyRate: number,
  contingencyRate: number,
  riskLevel: ChangeRiskLevel,
  params: ChangeImpactParameters = DEFAULT_CHANGE_PARAMETERS,
): ChangeFinancialBreakdown {
  const laborCost = probableHours * hourlyRate;
  const imssEstimated = laborCost * FISCAL_RATES_FALLBACK.imssPatronalApprox;
  const isnEstimated = laborCost * FISCAL_RATES_FALLBACK.isnZacatecasEffective;
  const adminOverhead = laborCost * FISCAL_RATES_FALLBACK.adminOverheadPct;
  const contingencyAmount = laborCost * contingencyRate;
  const subtotalBeforeVat = laborCost + imssEstimated + isnEstimated + adminOverhead + contingencyAmount;
  const vat = subtotalBeforeVat * FISCAL_RATES_FALLBACK.iva;
  const totalInvoice = subtotalBeforeVat + vat;
  const maintenanceMonthlyImpact = computeMaintenanceImpact(subtotalBeforeVat, riskLevel, params.maintenanceRateByRisk);
  return {
    laborCost,
    imssEstimated,
    isnEstimated,
    adminOverhead,
    contingencyAmount,
    subtotalBeforeVat,
    vat,
    totalInvoice,
    maintenanceMonthlyImpact,
  };
}

/**
 * Impacto mensual incremental en mantenimiento según riesgo del cambio.
 * Cambios de alto riesgo o críticos requieren más monitoreo y soporte continuo.
 */
export function computeMaintenanceImpact(
  subtotalBeforeVat: number,
  riskLevel: ChangeRiskLevel,
  rateByRisk: Record<ChangeRiskLevel, number>,
): number {
  return Math.max(0, subtotalBeforeVat * rateByRisk[riskLevel]);
}

/**
 * Explicación en lenguaje plano para el cliente (Ayuntamiento). Sin jerga técnica.
 */
export function buildPlainExplanationForClient(
  input: ChangeImpactInput,
  type: ChangeType,
  riskLevel: ChangeRiskLevel,
  requiresFormalApproval: boolean,
): string[] {
  const out: string[] = [];
  const a = input.affectedArtifacts;

  const cosas: string[] = [];
  if (a.uiScreens > 0) cosas.push(a.uiScreens === 1 ? "una pantalla" : `${a.uiScreens} pantallas`);
  if (a.databaseTables > 0) cosas.push("guardar nuevos datos");
  if (a.rolesPermissions > 0) cosas.push("permisos o autorizaciones");
  if (a.reports > 0) cosas.push("uno o más reportes");
  if (a.externalIntegrations > 0) cosas.push("conexión con otro sistema");

  if (cosas.length === 0) {
    out.push("El cambio solicitado no parece tocar partes críticas del sistema.");
  } else {
    out.push(`Este cambio toca: ${cosas.join(", ")}.`);
  }

  if (type === "garantia") {
    out.push("Por la naturaleza del cambio, el proveedor lo absorbe sin costo adicional.");
  } else if (type === "nuevo_alcance" || type === "cambio_estructural") {
    out.push("Es un cambio que aumenta el alcance del contrato original. Requiere cotización y aprobación formal.");
  } else if (type === "mejora") {
    out.push("Es una mejora dentro del alcance, pero con costo adicional porque agrega trabajo.");
  } else {
    out.push("Es un ajuste menor sobre el alcance existente.");
  }

  if (input.currentPhase === "after_testing" || input.currentPhase === "after_acceptance" || input.currentPhase === "in_production") {
    out.push("Se solicita en una fase avanzada del proyecto, por eso cuesta más: hay que rehacer pruebas y validar de nuevo con los usuarios.");
  }

  if (riskLevel === "alto" || riskLevel === "critico") {
    out.push("Tiene riesgo alto: puede afectar datos, seguridad o conexiones externas. El proveedor recomienda revisión cuidadosa antes de aprobar.");
  }

  if (requiresFormalApproval) {
    out.push("Antes de ejecutar este cambio se necesita firma de la persona autorizada del Ayuntamiento.");
  }

  if (input.clarityLevel <= 2) {
    out.push("La solicitud original no fue del todo clara. Se agregaron preguntas para confirmar lo que realmente se necesita.");
  }

  return out;
}

/**
 * Explicación técnica para el proveedor con desglose numérico de la fórmula.
 */
export function buildTechnicalExplanationForProvider(
  input: ChangeImpactInput,
  breakdown: ChangeImpactBreakdown,
  financial: ChangeFinancialBreakdown,
  hourlyRate: number,
): string[] {
  const out: string[] = [];
  out.push(
    `Puntos de artefactos: ${breakdown.artifactPoints.toFixed(0)} (suma ponderada de pantallas, endpoints, tablas, etc.).`,
  );
  out.push(
    `Factores aplicados: claridad ${breakdown.clarityFactor.toFixed(2)}, fase ${breakdown.phaseFactor.toFixed(2)}, riesgo ${breakdown.riskFactor.toFixed(3)}, modo ${breakdown.modeFactorAdjusted.toFixed(2)}${breakdown.appliedFloor ? " (con piso por alto riesgo)" : ""}.`,
  );
  out.push(
    `Base = ${breakdown.artifactPoints.toFixed(0)} × ${breakdown.clarityFactor.toFixed(2)} × ${breakdown.phaseFactor.toFixed(2)} × ${breakdown.riskFactor.toFixed(3)} × ${breakdown.modeFactorAdjusted.toFixed(2)} = ${breakdown.baseHours.toFixed(1)} h.`,
  );
  out.push(
    `Contingencia ${(breakdown.contingencyRate * 100).toFixed(0)}% sobre base = ${breakdown.contingencyHours.toFixed(1)} h. Probable total = ${breakdown.estimatedHours.toFixed(1)} h.`,
  );
  out.push(
    `Tarifa por hora: $${hourlyRate.toLocaleString("es-MX")} MXN. Mano de obra: $${financial.laborCost.toLocaleString("es-MX", { maximumFractionDigits: 0 })}.`,
  );
  out.push(
    `IMSS patronal estimado: $${financial.imssEstimated.toLocaleString("es-MX", { maximumFractionDigits: 0 })}; ISN+UAZ: $${financial.isnEstimated.toLocaleString("es-MX", { maximumFractionDigits: 0 })}; admin overhead: $${financial.adminOverhead.toLocaleString("es-MX", { maximumFractionDigits: 0 })}.`,
  );
  out.push(
    `Subtotal antes de IVA: $${financial.subtotalBeforeVat.toLocaleString("es-MX", { maximumFractionDigits: 0 })}. IVA 16%: $${financial.vat.toLocaleString("es-MX", { maximumFractionDigits: 0 })}. Total a facturar: $${financial.totalInvoice.toLocaleString("es-MX", { maximumFractionDigits: 0 })}.`,
  );
  out.push(
    `Impacto incremental en mantenimiento mensual: $${financial.maintenanceMonthlyImpact.toLocaleString("es-MX", { maximumFractionDigits: 0 })}.`,
  );
  if (input.developmentMode === "low_code" || input.developmentMode === "bytecoding_prompts") {
    out.push(
      `Modo de desarrollo elegido: ${input.developmentMode}. Reduce horas de codificación pero NO elimina pruebas, aceptación ni mantenimiento.`,
    );
  }
  return out;
}

/**
 * Referencias legales aplicables al cambio, según el contexto.
 */
export function buildLegalReferences(input: ChangeImpactInput): string[] {
  const refs: string[] = [];
  refs.push("LIVA Art. 1 (IVA 16% sobre subtotal)");
  refs.push("LISR Art. 9 (ISR persona moral 30%)");
  refs.push("LSS Art. 25-106 (cuotas IMSS patronal)");
  refs.push("Ley de Hacienda del Estado de Zacatecas (ISN 3.5% + UAZ 10%)");
  if (input.affectedArtifacts.dataMigrationObjects > 0 || input.dataImpact >= 2) {
    refs.push("LGPDPPSO (Ley General de Protección de Datos Personales en Posesión de Sujetos Obligados, aplicable al Ayuntamiento)");
    refs.push("LFPDPPP (Ley Federal de Protección de Datos Personales en Posesión de los Particulares, aplicable al proveedor)");
  }
  if (input.currentPhase === "after_acceptance" || input.currentPhase === "in_production") {
    refs.push("LFT Art. 50 (indemnización en caso de terminación, si afecta personal en nómina)");
  }
  return refs;
}

/**
 * Guardrail: bloquea "incluido sin costo" en escenarios donde no debe absorberse.
 * Retorna null si está permitido, o un string con la razón si está bloqueado.
 */
export function evaluateFreeChangeGuardrail(
  costImpact: number,
  riskLevel: ChangeRiskLevel,
  requiresFormalApproval: boolean,
  phase: ChangeImpactInput["currentPhase"],
  freeChangeLimitMxn: number,
): string | null {
  if (requiresFormalApproval) {
    return "Requiere aprobación formal: no se puede marcar como 'incluido sin costo' sin comentario y autorizador.";
  }
  if (costImpact > freeChangeLimitMxn) {
    return `Costo estimado ($${costImpact.toLocaleString("es-MX", { maximumFractionDigits: 0 })}) excede el tope para cambios libres ($${freeChangeLimitMxn.toLocaleString("es-MX")}).`;
  }
  if (phase === "after_testing" || phase === "after_acceptance" || phase === "in_production") {
    return "Se solicita en fase avanzada (post-pruebas, aceptado o en producción): no debe absorberse sin costo.";
  }
  if (riskLevel === "alto" || riskLevel === "critico") {
    return `Riesgo ${riskLevel}: no debe absorberse sin costo ni revisión.`;
  }
  return null;
}

// ====== Función principal ======

/**
 * Calcula el impacto de un cambio. v7: acepta `params` opcional para usar valores
 * desde tabla Parameter. Sin params usa DEFAULT_CHANGE_PARAMETERS (compatibilidad v6).
 */
export function computeChangeImpact(
  input: ChangeImpactInput,
  params: ChangeImpactParameters = DEFAULT_CHANGE_PARAMETERS,
): ChangeImpactResult {
  const highRisk = isHighRiskChange(input);

  const artifactPoints = computeArtifactPoints(input.affectedArtifacts, params.artifactWeights);
  const clarityFactor = params.clarityFactor[input.clarityLevel];
  const phaseFactor = params.phaseFactor[input.currentPhase];
  const modeFactorRaw = params.modeFactor[input.developmentMode];
  const modeFactor = applyModeFloor(modeFactorRaw, highRisk, params.highRiskModeFloor);

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
  const contingencyRate = params.contingencyByType[contingencyType];
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

  // v7: aplicar costo mínimo
  const hourlyRate = params.hourlyRateDefaultMxn;
  const costImpactRaw = probableHours * hourlyRate;
  const minimumChargeApplied = costImpactRaw < params.minimumChargeMxn && costImpactRaw > 0;
  const costImpact = Math.max(costImpactRaw, params.minimumChargeMxn);

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

  // === v7: campos nuevos opcionales ===
  const financialBreakdown = computeFinancialBreakdown(probableHours, hourlyRate, contingencyRate, riskLevel, params);
  const plainExplanationForClient = buildPlainExplanationForClient(input, suggestedType, riskLevel, requiresFormalApproval);
  const technicalExplanationForProvider = buildTechnicalExplanationForProvider(input, breakdown, financialBreakdown, hourlyRate);
  const legalReferences = buildLegalReferences(input);
  const freeChangeGuardrailReason = evaluateFreeChangeGuardrail(
    costImpact,
    riskLevel,
    requiresFormalApproval,
    input.currentPhase,
    params.freeChangeLimitMxn,
  );

  // Si se usaron defaults, advertir en explanation
  if (params.fallbackWarnings.length > 0 && params !== DEFAULT_CHANGE_PARAMETERS) {
    explanation.push(
      `Advertencia: ${params.fallbackWarnings.length} parámetro(s) usaron valor default por no estar en la tabla Parameter.`,
    );
  }

  return {
    suggestedType,
    contingencyType,
    optimisticHours,
    probableHours,
    conservativeHours,
    estimatedHours: probableHours,
    costImpact,
    hourlyRateUsed: hourlyRate,
    calendarImpactDays,
    riskLevel,
    requiresNewBaseline,
    requiresFormalApproval,
    explanation,
    questionsToClarify,
    breakdown,
    // v7
    plainExplanationForClient,
    technicalExplanationForProvider,
    financialBreakdown,
    maintenanceImpactMonthly: financialBreakdown.maintenanceMonthlyImpact,
    legalReferences,
    parameterSourceKeys: params.loadedKeys,
    fallbackWarnings: params.fallbackWarnings,
    freeChangeGuardrailReason,
    minimumChargeApplied,
  };
}

export {
  ARTIFACT_WEIGHTS,
  CLARITY_FACTOR,
  PHASE_FACTOR,
  MODE_FACTOR,
  CONTINGENCY_BY_TYPE,
  HIGH_RISK_MODE_FLOOR,
  // v7
  DEFAULT_ARTIFACT_WEIGHTS,
  DEFAULT_CLARITY_FACTOR,
  DEFAULT_PHASE_FACTOR,
  DEFAULT_MODE_FACTOR,
  DEFAULT_CONTINGENCY_BY_TYPE,
  DEFAULT_HIGH_RISK_MODE_FLOOR,
  DEFAULT_MAINTENANCE_RATE_BY_RISK,
  DEFAULT_MINIMUM_CHARGE_MXN,
  DEFAULT_HOURLY_RATE_MXN,
  DEFAULT_FREE_CHANGE_LIMIT_MXN,
  FISCAL_RATES_FALLBACK,
};
