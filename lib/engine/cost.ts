/**
 * Costo fiscal-laboral (07_motor_formulas.md §4) y precio (§5).
 * Implementa los dos modos: detallado por ramo IMSS y "factor estimado".
 */
import type {
  FiscalRates,
  ProfileCostInput,
  ProfileCostBreakdown,
  PricingInput,
  PricingResult,
  IMSSRiskClass,
} from "./types";

const DAYS_PER_MONTH_DEFAULT = 30.4;
const PRESTACIONES_LFT_FACTOR = 0.0833 + (15 / 365);  // ~0.124 (vacaciones+aguinaldo aproximado)

/**
 * Calcula la cuota CEAV patronal segun el SBC en UMAs (tabla escalonada 2026).
 */
export function ceavPatronRate(
  sbcInUma: number,
  ceavTable: Record<string, number>,
): number {
  // El JSON usa keys como "hasta_1.00_UMA", "1.01_a_1.50_UMA", etc.
  // Aplicamos rangos manualmente:
  if (sbcInUma <= 1.0) return ceavTable["hasta_1.00_UMA"] ?? 0.0315;
  if (sbcInUma <= 1.5) return ceavTable["1.01_a_1.50_UMA"] ?? 0.03676;
  if (sbcInUma <= 2.0) return ceavTable["1.51_a_2.00_UMA"] ?? 0.04851;
  if (sbcInUma <= 2.5) return ceavTable["2.01_a_2.50_UMA"] ?? 0.05556;
  if (sbcInUma <= 3.0) return ceavTable["2.51_a_3.00_UMA"] ?? 0.06026;
  if (sbcInUma <= 3.5) return ceavTable["3.01_a_3.50_UMA"] ?? 0.06361;
  if (sbcInUma <= 4.0) return ceavTable["3.51_a_4.00_UMA"] ?? 0.06613;
  return ceavTable["4.01_UMA_o_mas"] ?? 0.07513;
}

/**
 * Calcula el costo mensual de un perfil con desglose detallado.
 */
export function computeProfileCostDetailed(
  input: ProfileCostInput,
  rates: FiscalRates,
): ProfileCostBreakdown {
  const days = input.daysPerMonth ?? DAYS_PER_MONTH_DEFAULT;
  const monthlySalary = input.monthlySalary;
  const sbcDiario = monthlySalary / days;
  const umaDiaria = rates.UMA_DIARIA;
  const sbcInUma = sbcDiario / umaDiaria;
  const sbcExcedente3Uma = Math.max(sbcDiario - 3 * umaDiaria, 0);

  // EyM
  const eymEspecieFija = rates.EYM_ESPECIE_FIJA_PATRON * umaDiaria * days;
  const eymEspecieExcedente = rates.EYM_ESPECIE_EXCEDENTE_PATRON * sbcExcedente3Uma * days;
  const eymDinero = rates.EYM_DINERO_PATRON * sbcDiario * days;
  const eymPensionados = rates.EYM_PENSIONADOS_PATRON * sbcDiario * days;

  // Riesgo de trabajo
  const clase: IMSSRiskClass = input.riskClass ?? "I";
  const riesgoTrabajo = rates.RIESGO_CLASE[clase] * sbcDiario * days;

  // IV
  const invalidezVida = rates.IV_PATRON * sbcDiario * days;

  // Guarderias
  const guarderias = rates.GUARDERIAS_PATRON * sbcDiario * days;

  // Retiro
  const retiro = rates.RETIRO_PATRON * sbcDiario * days;

  // CEAV (patronal escalonada)
  const ceavRate = ceavPatronRate(sbcInUma, rates.CEAV_PATRON_TABLE);
  const ceav = ceavRate * sbcDiario * days;

  const imssPatronal =
    eymEspecieFija +
    eymEspecieExcedente +
    eymDinero +
    eymPensionados +
    riesgoTrabajo +
    invalidezVida +
    guarderias +
    retiro +
    ceav;

  // INFONAVIT
  const infonavit = rates.INFONAVIT * sbcDiario * days;

  // ISN + UAZ (sobre total remuneraciones que aproximamos al salario)
  const isnNeto = monthlySalary * rates.ISN;
  const adicionalUaz = isnNeto * rates.UAZ;
  const isnTotal = isnNeto + adicionalUaz;

  // Provisiones LFT (aguinaldo + prima vac proporcional mensual)
  const benefitsProvision = input.benefitsProvision ?? monthlySalary * PRESTACIONES_LFT_FACTOR;

  // Cuotas obreras (informativo — se descuentan del trabajador, no son costo del patron)
  const obreroDescontado =
    rates.EYM_ESPECIE_EXCEDENTE_OBRERO * sbcExcedente3Uma * days +
    rates.EYM_DINERO_OBRERO * sbcDiario * days +
    rates.EYM_PENSIONADOS_OBRERO * sbcDiario * days +
    rates.IV_OBRERO * sbcDiario * days +
    rates.CV_OBRERO * sbcDiario * days;

  const toolsCost = input.toolsCost ?? 0;
  const adminOverhead = input.adminOverhead ?? 0;

  const total =
    monthlySalary +
    benefitsProvision +
    imssPatronal +
    infonavit +
    isnTotal +
    toolsCost +
    adminOverhead;

  return {
    salary: monthlySalary,
    benefitsProvision,
    imssPatronal,
    infonavit,
    isnTotal,
    toolsCost,
    adminOverhead,
    total,
    imssDetail: {
      eymEspecieFija,
      eymEspecieExcedente,
      eymDinero,
      eymPensionados,
      riesgoTrabajo,
      invalidezVida,
      guarderias,
      retiro,
      ceav,
    },
    obreroDescontado,
  };
}

/**
 * Modo "factor estimado" — aplica un % agregado sobre el salario.
 * Util cuando el proveedor no desglosa cargas.
 */
export function computeProfileCostEstimated(
  input: ProfileCostInput,
  rates: FiscalRates,
): ProfileCostBreakdown {
  const factor = input.estimatedFactor ?? 0.40;
  const benefitsProvision = input.monthlySalary * factor;
  const isnNeto = input.monthlySalary * rates.ISN;
  const isnTotal = isnNeto * (1 + rates.UAZ);
  // El factor 0.40 ya incluye IMSS+INFONAVIT+provisiones LFT pero NO el ISN-UAZ
  const total = input.monthlySalary + benefitsProvision + isnTotal + (input.toolsCost ?? 0) + (input.adminOverhead ?? 0);
  return {
    salary: input.monthlySalary,
    benefitsProvision,
    imssPatronal: 0,
    infonavit: 0,
    isnTotal,
    toolsCost: input.toolsCost ?? 0,
    adminOverhead: input.adminOverhead ?? 0,
    total,
  };
}

/**
 * Selector que despacha al modo correcto.
 */
export function computeProfileCost(
  input: ProfileCostInput,
  rates: FiscalRates,
): ProfileCostBreakdown {
  return input.useEstimatedFactor
    ? computeProfileCostEstimated(input, rates)
    : computeProfileCostDetailed(input, rates);
}

/**
 * Precio: subtotal/IVA/total con margen objetivo.
 * subtotal = total_cost / (1 - target_margin)
 */
export function computePricing(input: PricingInput, ivaRate: number): PricingResult {
  if (input.targetMargin >= 1 || input.targetMargin < 0) {
    throw new Error("targetMargin debe estar en [0, 1)");
  }
  const subtotal = input.totalCost / (1 - input.targetMargin);
  const vat = subtotal * ivaRate;
  return {
    subtotal,
    vat,
    total: subtotal + vat,
    marginAmount: subtotal - input.totalCost,
  };
}

export function computeISR(
  subtotal: number,
  deducibles: number,
  noDeduciblesAjustados: number,
  isrRate: number,
): number {
  const utilidad = Math.max(0, subtotal - deducibles - noDeduciblesAjustados);
  return utilidad * isrRate;
}
