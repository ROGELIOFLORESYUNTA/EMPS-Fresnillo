/**
 * Tipos del motor de estimacion (lib/engine).
 * Mantenidos puros para no depender de Prisma ni de Next.js.
 */
export type DevelopmentMode =
  | "traditional"
  | "ai_assisted"
  | "bytecoding_prompts"
  | "low_code"
  | "hybrid";

/** Aliases hacia atras (codigos previos) que se aceptan en entrada y se normalizan. */
export const MODE_ALIASES: Record<string, DevelopmentMode> = {
  assisted: "ai_assisted",
  bytecoding: "bytecoding_prompts",
  ai_assisted: "ai_assisted",
  bytecoding_prompts: "bytecoding_prompts",
  low_code: "low_code",
  traditional: "traditional",
  hybrid: "hybrid",
};

export function normalizeMode(input: string): DevelopmentMode {
  const normalized = MODE_ALIASES[input.toLowerCase()];
  if (!normalized) throw new Error(`Modo de desarrollo desconocido: ${input}`);
  return normalized;
}
export type Scenario = "optimistic" | "probable" | "conservative";
export type IMSSRiskClass = "I" | "II" | "III" | "IV" | "V";

export interface ModuleInput {
  complexity: number;        // 1-5
  clarity: number;           // 1-5 (madurez del requerimiento)
  criticality: number;       // 1-5
  screensCount: number;
  reportsCount: number;
  catalogsCount?: number;
  integrationsCount: number;
  sensitiveData: boolean;
}

export interface ProjectInput {
  modules: ModuleInput[];
  dataMigration: boolean;
  externalIntegrationsCount: number;
  changeProbability: number;       // 0..1
  clientUnavailability: number;    // 0..1
  turnoverRisk: number;            // 0..1
  clientAvailability: number;      // 0..1 (inverso de unavailability — UI puede usar este)
}

export interface TeamCapacityInput {
  weeklyHoursTotal: number;        // capacidad horas/semana del equipo (todas personas, ya ponderadas)
}

export interface ModeFactors {
  coding: number;
  review: number;
  testing: number;
  documentation: number;
  deployment: number;
  management?: number;             // present excepto bytecoding
  hardening?: number;              // solo bytecoding
}

export interface ModeVelocity {
  velocity_factor: number;
  prototype_speedup: number;
  hardening_overhead: number;
  prototype_quality_factor?: number;
  notes?: string;
}

export interface DevModeFactors {
  traditional: ModeFactors;
  ai_assisted: ModeFactors;
  bytecoding_prompts: ModeFactors;
  low_code: ModeFactors;
  hybrid: ModeFactors;
  _expected_sums: Record<DevelopmentMode, number>;
}

export interface DevModeVelocity {
  traditional: ModeVelocity;
  ai_assisted: ModeVelocity;
  bytecoding_prompts: ModeVelocity;
  low_code: ModeVelocity;
  hybrid: ModeVelocity;
}

export interface ScenarioFactors {
  optimistic: number;
  probable: number;
  conservative_min: number;
  conservative_max: number;
}

export interface PhaseHours {
  analysis: number;
  design: number;
  coding: number;
  review: number;
  testing: number;
  documentation: number;
  deployment: number;
  training: number;
  support: number;
  hardening: number;
}

export interface EffortResult {
  basePoints: number;
  clarityFactor: number;
  riskFactor: number;
  technicalEffort: number;
  modeApplied: DevelopmentMode;
  phases: PhaseHours;
  totalEffortHours: number;
  expectedSum: number;
  actualSum: number;
}

export interface ScenarioResult {
  scenario: Scenario;
  factor: number;
  totalEffortHours: number;
  phases: PhaseHours;
}

export interface CalendarResult {
  weeksTotal: number;
  weeksToPrototype: number;
  prototypeQualityPct?: number;
}

export interface FiscalRates {
  IVA: number;
  ISR: number;
  ISN: number;
  UAZ: number;
  UMA_DIARIA: number;
  INFONAVIT: number;
  // Cuotas IMSS (rates sobre SBC excepto donde se indique base diferente)
  EYM_ESPECIE_FIJA_PATRON: number;
  EYM_ESPECIE_EXCEDENTE_PATRON: number;
  EYM_ESPECIE_EXCEDENTE_OBRERO: number;
  EYM_DINERO_PATRON: number;
  EYM_DINERO_OBRERO: number;
  EYM_PENSIONADOS_PATRON: number;
  EYM_PENSIONADOS_OBRERO: number;
  IV_PATRON: number;
  IV_OBRERO: number;
  GUARDERIAS_PATRON: number;
  RETIRO_PATRON: number;
  CV_OBRERO: number;
  RIESGO_CLASE: Record<IMSSRiskClass, number>;
  CEAV_PATRON_TABLE: Record<string, number>;
}

export interface ProfileCostInput {
  monthlySalary: number;
  benefitsProvision?: number;       // si null, se estima
  toolsCost?: number;
  adminOverhead?: number;
  riskClass?: IMSSRiskClass;        // default "I"
  daysPerMonth?: number;            // default 30.4
  useEstimatedFactor?: boolean;     // si true, usa factor agregado en lugar de detalle por ramo
  estimatedFactor?: number;         // default 0.40
}

export interface ProfileCostBreakdown {
  salary: number;
  benefitsProvision: number;
  imssPatronal: number;
  infonavit: number;
  isnTotal: number;          // ISN + UAZ
  toolsCost: number;
  adminOverhead: number;
  total: number;
  // Detalle IMSS para auditoria
  imssDetail?: {
    eymEspecieFija: number;
    eymEspecieExcedente: number;
    eymDinero: number;
    eymPensionados: number;
    riesgoTrabajo: number;
    invalidezVida: number;
    guarderias: number;
    retiro: number;
    ceav: number;
  };
  obreroDescontado?: number; // suma cuotas obreras (informativo)
}

export interface PricingInput {
  totalCost: number;
  targetMargin: number;       // 0..0.99
}

export interface PricingResult {
  subtotal: number;
  vat: number;
  total: number;
  marginAmount: number;
}

export interface CashFlowMonth {
  monthNumber: number;
  income: number;
  payrollOutflow: number;
  taxOutflow: number;
  toolsOutflow: number;
  adminOutflow: number;
  netFlow: number;
  accumulatedFlow: number;
}

export interface CashFlowResult {
  months: CashFlowMonth[];
  workingCapitalRequired: number;
}

export interface RiskBreakdown {
  technical: number;
  requirements: number;
  fiscal: number;
  cashFlow: number;
  change: number;
  total: number;
  level: "bajo" | "medio" | "alto" | "critico";
}
