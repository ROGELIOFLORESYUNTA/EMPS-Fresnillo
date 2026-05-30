/**
 * Funciones puras para los reportes orientados a audiencia (FASE G.H).
 *
 * Cada función responde una pregunta concreta que se le hace al
 * Ayuntamiento o al Proveedor:
 *   - ¿Está ganando realmente el proveedor o pierde frente a un empleo asalariado?
 *   - ¿Aguanta el proyecto financieramente (bache vs margen)?
 *   - ¿Riesgo de que el proveedor quiebre y deje el proyecto?
 *   - ¿Va a terminar a tiempo?
 *   - ¿Cuánto cuesta mantenerlo cada mes?
 *   - ¿Cuánto sale un cambio cuando el cliente lo pida?
 *
 * No hay I/O. Sin Prisma, sin Next. Entrada y salida son numbers / Date plain.
 */

import type { ChangeType } from "./change-types";

// ============================================================
// 1. Costo de oportunidad del proveedor
// ============================================================

export type OpportunityLevel = "ganas_claro" | "empate" | "perdiendo_poco" | "perdiendo_mucho";

export interface OpportunityCostResult {
  marginMonthly: number;
  marketMonthly: number;
  deficit: number;
  ratio: number;
  level: OpportunityLevel;
  warningNoMonthsAssigned: boolean;
}

/**
 * Compara el margen mensual equivalente del proyecto con lo que
 * un líder técnico ganaría asalariado en el mercado.
 *
 *  - ratio ≥ 1.3 → "ganas_claro"
 *  - ratio ≥ 1.0 → "empate"
 *  - ratio ≥ 0.7 → "perdiendo_poco"
 *  - ratio < 0.7 → "perdiendo_mucho"
 */
export function computeProviderOpportunityCost(
  marginAmount: number,
  leadTechnicianMonthlySalary: number,
  monthsAssigned: number,
): OpportunityCostResult {
  const safeMonths = monthsAssigned > 0 ? monthsAssigned : 1;
  const warningNoMonthsAssigned = monthsAssigned <= 0;
  const marginMonthly = marginAmount / safeMonths;
  const marketMonthly = Math.max(0, leadTechnicianMonthlySalary);
  const deficit = marketMonthly - marginMonthly;
  const ratio = marketMonthly > 0 ? marginMonthly / marketMonthly : Infinity;

  let level: OpportunityLevel;
  if (ratio >= 1.3) level = "ganas_claro";
  else if (ratio >= 1.0) level = "empate";
  else if (ratio >= 0.7) level = "perdiendo_poco";
  else level = "perdiendo_mucho";

  return { marginMonthly, marketMonthly, deficit, ratio, level, warningNoMonthsAssigned };
}

// ============================================================
// 2. Viabilidad del proveedor (bache vs margen)
// ============================================================

export type ViabilityLevel = "comodo" | "apretado" | "rojo";

export interface ViabilityResult {
  ratio: number;
  level: ViabilityLevel;
}

/**
 * Si el bache de caja se acerca o excede el margen total, el proveedor
 * está poniendo más capital del que va a ganar. Eso es señal "rojo".
 *
 *  - ratio < 0.5 → "comodo"
 *  - ratio < 1.0 → "apretado"
 *  - ratio ≥ 1.0 → "rojo"
 */
export function computeProviderViabilityRatio(
  workingCapitalRequired: number,
  marginAmount: number,
): ViabilityResult {
  if (marginAmount <= 0) {
    return { ratio: Infinity, level: "rojo" };
  }
  const ratio = workingCapitalRequired / marginAmount;
  let level: ViabilityLevel;
  if (ratio < 0.5) level = "comodo";
  else if (ratio < 1.0) level = "apretado";
  else level = "rojo";
  return { ratio, level };
}

// ============================================================
// 3. Riesgo de que el proveedor quiebre (mirada del Ayuntamiento)
// ============================================================

export type QuebrarLevel = "bajo" | "medio" | "alto";

export interface QuebrarRiskResult {
  ratio: number;
  level: QuebrarLevel;
}

/**
 * Ratio del bache de caja sobre el precio total del proyecto.
 * Si el proveedor debe poner más del 30% del precio antes de cobrar
 * todo, la probabilidad de que abandone a media obra es alta.
 *
 *  - ratio < 0.15 → "bajo"
 *  - ratio < 0.30 → "medio"
 *  - ratio ≥ 0.30 → "alto"
 */
export function computeMunicipalQuebrarRisk(
  workingCapitalRequired: number,
  totalPrice: number,
): QuebrarRiskResult {
  if (totalPrice <= 0) {
    return { ratio: Infinity, level: "alto" };
  }
  const ratio = workingCapitalRequired / totalPrice;
  let level: QuebrarLevel;
  if (ratio < 0.15) level = "bajo";
  else if (ratio < 0.30) level = "medio";
  else level = "alto";
  return { ratio, level };
}

// ============================================================
// 4. Riesgo de no terminar a tiempo
// ============================================================

export type OnTimeLevel = "sin_fecha" | "holgado" | "apretado" | "alto_riesgo";

export interface OnTimeResult {
  weeksNeeded: number;
  weeksAvailable: number | null;
  ratio: number | null;
  level: OnTimeLevel;
  estimatedEndDate: Date;
  daysOverDeadline: number | null;
}

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

/**
 * Compara las semanas estimadas vs las semanas disponibles hasta la fecha
 * objetivo del proyecto. Si no hay targetDate, devuelve "sin_fecha" sin
 * disparar alerta.
 *
 *  - ratio ≤ 0.7 → "holgado"
 *  - ratio ≤ 0.9 → "apretado"
 *  - ratio > 0.9 → "alto_riesgo"
 */
export function computeOnTimeRisk(
  weeksTotal: number,
  targetDate: Date | null,
  reference: Date,
): OnTimeResult {
  const weeksNeeded = Math.max(0, weeksTotal);
  const estimatedEndDate = new Date(reference.getTime() + weeksNeeded * MS_PER_WEEK);

  if (!targetDate) {
    return {
      weeksNeeded,
      weeksAvailable: null,
      ratio: null,
      level: "sin_fecha",
      estimatedEndDate,
      daysOverDeadline: null,
    };
  }

  const msAvailable = targetDate.getTime() - reference.getTime();
  const weeksAvailable = msAvailable > 0 ? msAvailable / MS_PER_WEEK : 0;
  const ratio = weeksAvailable > 0 ? weeksNeeded / weeksAvailable : Infinity;
  const daysOverDeadline = Math.round(
    (estimatedEndDate.getTime() - targetDate.getTime()) / (24 * 60 * 60 * 1000),
  );

  let level: OnTimeLevel;
  if (weeksAvailable <= 0 || ratio > 0.9) level = "alto_riesgo";
  else if (ratio > 0.7) level = "apretado";
  else level = "holgado";

  return { weeksNeeded, weeksAvailable, ratio, level, estimatedEndDate, daysOverDeadline };
}

// ============================================================
// 5. Mantenimiento mensual estimado
// ============================================================

export interface MaintenanceResult {
  monthlyAmount: number;
  annualAmount: number;
  pctOfTotal: number;
}

/**
 * Estimación heurística (PMBOK 7 / ISBSG) del costo mensual de
 * mantener el sistema post-entrega. Default 2% del precio total
 * por mes (equivalente a ~24% anual, dentro del rango ISBSG 15-30%).
 */
export function computeMaintenanceMonthly(
  totalPrice: number,
  ratePct = 0.02,
): MaintenanceResult {
  const safeRate = Math.max(0, ratePct);
  const monthlyAmount = Math.max(0, totalPrice) * safeRate;
  return {
    monthlyAmount,
    annualAmount: monthlyAmount * 12,
    pctOfTotal: safeRate,
  };
}

// ============================================================
// 6. Rango aproximado de costo por tipo de cambio
// ============================================================

export interface ChangeRangeRow {
  type: ChangeType;
  etiqueta: string;
  minCost: number;
  maxCost: number;
  description: string;
}

const HOURS_PER_WEEK_DEFAULT = 40;

/**
 * Devuelve una tabla con rangos aproximados de costo para cada tipo
 * de cambio típico, basados en un weekly team rate ya calculado.
 *
 * No se acopla al motor v7: usa perfiles "pequeño" y "mediano" con
 * heurísticas simples para que el reporte pueda mostrar la tabla
 * incluso cuando aún no hay cambios reales registrados.
 */
export function computeChangeRangeByType(
  weeklyTeamRate: number,
  hoursPerWeek: number = HOURS_PER_WEEK_DEFAULT,
): ChangeRangeRow[] {
  const hourlyRate = hoursPerWeek > 0 ? weeklyTeamRate / hoursPerWeek : 0;
  const OPTIMISTIC = 0.85;
  const CONSERVATIVE = 1.25;

  // Horas-base "típicas" para cada tipo (perfil pequeño y mediano).
  const HOURS_BY_TYPE: Record<ChangeType, { min: number; max: number; etiqueta: string; description: string }> = {
    correccion: {
      min: 2, max: 8,
      etiqueta: "Corrección menor",
      description: "Ajuste sobre alcance ya entregado (texto, validación, formato).",
    },
    garantia: {
      min: 4, max: 16,
      etiqueta: "Garantía",
      description: "Defecto del producto que el proveedor cubre sin cobro adicional.",
    },
    ajuste_menor: {
      min: 8, max: 24,
      etiqueta: "Ajuste menor",
      description: "Cambio pequeño dentro del alcance (un campo nuevo, una validación, un permiso).",
    },
    mejora: {
      min: 24, max: 80,
      etiqueta: "Mejora",
      description: "Nueva funcionalidad dentro del alcance (un reporte adicional, un flujo extra).",
    },
    nuevo_alcance: {
      min: 80, max: 240,
      etiqueta: "Nuevo alcance",
      description: "Módulo o integración que NO estaba en el contrato original.",
    },
    cambio_estructural: {
      min: 240, max: 800,
      etiqueta: "Cambio estructural",
      description: "Rediseño de base de datos, seguridad o arquitectura. Requiere nueva línea base.",
    },
  };

  return (Object.keys(HOURS_BY_TYPE) as ChangeType[]).map((type) => {
    const cfg = HOURS_BY_TYPE[type];
    return {
      type,
      etiqueta: cfg.etiqueta,
      minCost: cfg.min * hourlyRate * OPTIMISTIC,
      maxCost: cfg.max * hourlyRate * CONSERVATIVE,
      description: cfg.description,
    };
  });
}
