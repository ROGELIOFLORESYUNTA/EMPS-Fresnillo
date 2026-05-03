/**
 * Cotización sugerida para un Change Request siguiendo la curva de costo del cambio
 * (Boehm / PMBOK 7 / Agile Modeling).
 *
 * Fórmula:
 *   sugerencia = max(minimo, horas × tarifa_hora × factor_fase × (1 + contingencia))
 *
 * Factor de fase (curva de Boehm — costo del cambio según el momento del proyecto):
 *   - inicio (requisitos/diseño)         → 1.0×
 *   - mitad (desarrollo activo)          → 1.5×
 *   - avanzado (post-pruebas/operación)  → 2.5×
 *
 * Contingencia: 10–15% estándar PMBOK; 20–25% en proyectos complejos.
 *
 * Mínimo: evita regalar tiempo en CRs pequeños (default 5,000 MXN).
 *
 * Fuente: Quantifying Disruption (PMI), ScopeMaster, Wayfront, Devlin Peck.
 */

export type ProjectPhase = "inicio" | "mitad" | "avanzado";

export const PHASE_FACTORS: Record<ProjectPhase, number> = {
  inicio: 1.0,
  mitad: 1.5,
  avanzado: 2.5,
};

export const PHASE_LABELS: Record<ProjectPhase, string> = {
  inicio: "Inicio (requisitos / diseño)",
  mitad: "A mitad (desarrollo en curso)",
  avanzado: "Avanzado (pruebas / post-entrega)",
};

export const DEFAULT_CONTINGENCY = 0.15;
export const DEFAULT_MIN_COST_MXN = 5000;

export interface ChangeCostInput {
  hours: number;
  hourlyRate: number;
  phase: ProjectPhase;
  contingency?: number;
  minimum?: number;
}

export interface ChangeCostBreakdown {
  baseCost: number;        // horas × tarifa
  phaseFactor: number;     // 1.0 / 1.5 / 2.5
  adjustedByPhase: number; // base × factor
  contingencyAmount: number;
  contingencyRate: number;
  suggestedTotal: number;  // resultado final (≥ minimum)
  hitMinimum: boolean;
}

export function computeChangeCost(input: ChangeCostInput): ChangeCostBreakdown {
  const hours = Math.max(0, input.hours);
  const rate = Math.max(0, input.hourlyRate);
  const factor = PHASE_FACTORS[input.phase];
  const contingencyRate = input.contingency ?? DEFAULT_CONTINGENCY;
  const minimum = input.minimum ?? DEFAULT_MIN_COST_MXN;

  const baseCost = hours * rate;
  const adjustedByPhase = baseCost * factor;
  const contingencyAmount = adjustedByPhase * contingencyRate;
  const beforeMinimum = adjustedByPhase + contingencyAmount;
  const suggestedTotal = Math.max(minimum, beforeMinimum);

  return {
    baseCost,
    phaseFactor: factor,
    adjustedByPhase,
    contingencyAmount,
    contingencyRate,
    suggestedTotal,
    hitMinimum: suggestedTotal === minimum && beforeMinimum < minimum,
  };
}
