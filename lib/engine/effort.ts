/**
 * Esfuerzo tecnico y distribucion por fase.
 * Implementa secciones 1, 2 y 3.bis de 07_motor_formulas.md.
 */
import type {
  ProjectInput,
  ModuleInput,
  DevelopmentMode,
  DevModeFactors,
  DevModeVelocity,
  EffortResult,
  PhaseHours,
  ScenarioFactors,
  ScenarioResult,
  Scenario,
  CalendarResult,
} from "./types";

const CLARITY_FACTOR_TABLE: Record<number, number> = {
  1: 1.80,
  2: 1.50,
  3: 1.25,
  4: 1.10,
  5: 1.00,
};

export function clarityFactor(level: number): number {
  if (!Number.isFinite(level)) throw new Error("clarityFactor: level invalido");
  const clamped = Math.max(1, Math.min(5, Math.round(level)));
  return CLARITY_FACTOR_TABLE[clamped]!;
}

export function avgClarity(modules: ModuleInput[]): number {
  if (modules.length === 0) return 3;
  const sum = modules.reduce((acc, m) => acc + m.clarity, 0);
  return sum / modules.length;
}

/**
 * Calcula los puntos base del proyecto. Cada punto representa aproximadamente 1 hora de esfuerzo
 * técnico ANTES de aplicar factores de claridad y riesgo. Calibración 2026-05-02 basada en
 * proyectos municipales reales: un módulo medio (complejidad 3-4, ~6 pantallas, 2 reportes,
 * datos sensibles) debe rendir ~80-150 puntos = 80-150 horas-persona base de codificación.
 * Este número se multiplica por clarity (1.0-1.8) y risk (1.0-2.0) para obtener el esfuerzo total.
 */
/**
 * Calcula los puntos base del proyecto (≈ horas de esfuerzo TÉCNICO TRADICIONAL).
 * Calibración 2026-05-02 ajustada a proyectos municipales reales: un sistema integral con
 * 8 módulos medios + datos sensibles + integraciones debería rendir ~2,000-3,000 horas
 * en modo tradicional (4 personas × 4-6 meses). Cada modo no-tradicional reduce calendario
 * por su velocity_factor, pero las horas-persona base son las mismas (es trabajo equivalente).
 */
export function computeBasePoints(project: ProjectInput): number {
  const moduleSum = project.modules.reduce((acc, m) => {
    const moduleScore =
      m.complexity * 50 +              // base por complejidad (1=trivial, 5=lógica negocio compleja)
      m.screensCount * 16 +            // ~16h por pantalla (formulario + validación + UX + responsive)
      m.reportsCount * 24 +            // ~24h por reporte (query + filtros + export + permisos)
      (m.catalogsCount ?? 0) * 12 +    // ~12h por catálogo (CRUD + búsqueda + import/export)
      m.integrationsCount * 50 +       // ~50h por integración (auth + manejo errores + reintentos + pruebas)
      (m.sensitiveData ? 36 : 0) +     // overhead seguridad/privacidad/LFPDPPP/bitácora
      (m.criticality - 1) * 12;        // pruebas y revisión adicional por criticidad
    return acc + Math.max(40, moduleScore); // mínimo 40h por módulo (5 días-persona — evita absurdos)
  }, 0);

  const externalIntegrations = project.externalIntegrationsCount * 80;  // arquitectura + seguridad
  const dataMigration = project.dataMigration ? 120 : 0;                 // ETL + validación + rollback + verificación
  const totalReports = project.modules.reduce((a, m) => a + m.reportsCount, 0);
  const reports = totalReports * 12;                                      // dashboard ejecutivo
  const securityWeight = project.modules.some((m) => m.sensitiveData) ? 96 : 0; // PIA + LFPDPPP + cifrado

  return moduleSum + externalIntegrations + dataMigration + reports + securityWeight;
}

export function riskFactor(project: ProjectInput): number {
  const r = 1 + project.changeProbability + project.clientUnavailability + project.turnoverRisk;
  return Math.min(2.0, r);
}

export function technicalEffort(project: ProjectInput): {
  basePoints: number;
  clarityFactor: number;
  riskFactor: number;
  technicalEffort: number;
} {
  const base = computeBasePoints(project);
  const cf = clarityFactor(avgClarity(project.modules));
  const rf = riskFactor(project);
  return {
    basePoints: base,
    clarityFactor: cf,
    riskFactor: rf,
    technicalEffort: base * cf * rf,
  };
}

/**
 * Distribuye el esfuerzo tecnico segun los coeficientes del modo.
 * Bytecoding suma 1.10 intencionalmente (hardening adicional) — no normalizamos a 1.0.
 * El motor valida que la suma corresponda con el _expected_sums declarado.
 */
export function distributeByMode(
  effort: number,
  mode: DevelopmentMode,
  factors: DevModeFactors,
  options?: { tolerance?: number },
): { phases: PhaseHours; totalEffortHours: number; expectedSum: number; actualSum: number } {
  const tolerance = options?.tolerance ?? 0.001;
  const m = factors[mode];
  const expected = factors._expected_sums[mode];

  const actualSum =
    m.coding +
    m.review +
    m.testing +
    m.documentation +
    m.deployment +
    (m.management ?? 0) +
    (m.hardening ?? 0);

  if (Math.abs(actualSum - expected) > tolerance) {
    throw new Error(
      `Coeficientes de modo "${mode}" no suman ${expected} (suma actual ${actualSum.toFixed(4)}). Verificar 17_seed_data_parametros_2026.json.`,
    );
  }

  // Repartimos analysis y design como porcentaje fijo dentro de coding (~ 25%)
  // No esta en el .md pero es razonable; las fases analysis y design son "pre-codigo".
  const codingHours = effort * m.coding;
  const analysisHours = codingHours * 0.15;
  const designHours = codingHours * 0.10;

  const phases: PhaseHours = {
    analysis: analysisHours,
    design: designHours,
    coding: codingHours - analysisHours - designHours,
    review: effort * m.review,
    testing: effort * m.testing,
    documentation: effort * m.documentation,
    deployment: effort * m.deployment,
    training: effort * m.documentation * 0.4,  // capacitacion ~40% de doc
    support: effort * (m.management ?? 0) * 0.5, // soporte inicial ~50% de mgmt
    hardening: effort * (m.hardening ?? 0),
  };

  const totalEffortHours =
    phases.analysis +
    phases.design +
    phases.coding +
    phases.review +
    phases.testing +
    phases.documentation +
    phases.deployment +
    phases.training +
    phases.support +
    phases.hardening;

  return { phases, totalEffortHours, expectedSum: expected, actualSum };
}

export function computeEffort(
  project: ProjectInput,
  mode: DevelopmentMode,
  factors: DevModeFactors,
): EffortResult {
  const t = technicalEffort(project);
  const dist = distributeByMode(t.technicalEffort, mode, factors);
  return {
    basePoints: t.basePoints,
    clarityFactor: t.clarityFactor,
    riskFactor: t.riskFactor,
    technicalEffort: t.technicalEffort,
    modeApplied: mode,
    phases: dist.phases,
    totalEffortHours: dist.totalEffortHours,
    expectedSum: dist.expectedSum,
    actualSum: dist.actualSum,
  };
}

/**
 * Aplica el factor conservador segun la incertidumbre acumulada (07_motor_formulas.md §3).
 */
export function conservativeFactor(project: ProjectInput, scenarios: ScenarioFactors): number {
  const avg = avgClarity(project.modules);
  let f = scenarios.conservative_min;
  if (avg < 3) f += 0.10;
  if (project.externalIntegrationsCount > 2) f += 0.10;
  if (project.modules.some((m) => m.sensitiveData)) f += 0.10;
  if (project.changeProbability > 0.3) f += 0.10;
  if (project.clientAvailability < 0.5) f += 0.05;
  return Math.min(scenarios.conservative_max, f);
}

export function computeScenarios(
  effort: EffortResult,
  project: ProjectInput,
  scenarios: ScenarioFactors,
): Record<Scenario, ScenarioResult> {
  const factors: Record<Scenario, number> = {
    optimistic: scenarios.optimistic,
    probable: scenarios.probable,
    conservative: conservativeFactor(project, scenarios),
  };

  const result = {} as Record<Scenario, ScenarioResult>;
  for (const [key, factor] of Object.entries(factors) as [Scenario, number][]) {
    const phases = scalePhases(effort.phases, factor);
    result[key] = {
      scenario: key,
      factor,
      totalEffortHours: effort.totalEffortHours * factor,
      phases,
    };
  }
  return result;
}

function scalePhases(phases: PhaseHours, factor: number): PhaseHours {
  return {
    analysis: phases.analysis * factor,
    design: phases.design * factor,
    coding: phases.coding * factor,
    review: phases.review * factor,
    testing: phases.testing * factor,
    documentation: phases.documentation * factor,
    deployment: phases.deployment * factor,
    training: phases.training * factor,
    support: phases.support * factor,
    hardening: phases.hardening * factor,
  };
}

/**
 * Tiempo calendario y aceleracion a prototipo (07_motor_formulas.md §3.bis).
 */
export function computeCalendar(
  effort: EffortResult,
  mode: DevelopmentMode,
  velocity: DevModeVelocity,
  weeklyCapacityHours: number,
): CalendarResult {
  if (weeklyCapacityHours <= 0) {
    throw new Error("computeCalendar: weeklyCapacityHours debe ser > 0");
  }
  const v = velocity[mode];
  const weeksTotal = effort.totalEffortHours / (weeklyCapacityHours * v.velocity_factor);
  const weeksToPrototype =
    effort.phases.coding / (weeklyCapacityHours * v.velocity_factor * v.prototype_speedup);
  const result: CalendarResult = {
    weeksTotal,
    weeksToPrototype,
  };
  if (mode === "bytecoding_prompts" && v.prototype_quality_factor !== undefined) {
    result.prototypeQualityPct = v.prototype_quality_factor;
  }
  return result;
}
