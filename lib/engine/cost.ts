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

/**
 * Días de vacaciones por año de antigüedad (LFT Art. 76, Reforma "Vacaciones
 * Dignas" vigente desde 2023). Se lee del parámetro LFT_VACACIONES_DIAS_2026
 * (que estaba sembrado en la BD y NADIE leía); este arreglo es solo el respaldo
 * si el parámetro faltara. Misma tabla que usa el motor de nómina de ContaCumple
 * en producción (apps/api/app/modules/payroll/calculator.py::vacation_days).
 */
const VACACIONES_FALLBACK: Record<string, number> = {
  anio_1: 12, anio_2: 14, anio_3: 16, anio_4: 18, anio_5: 20,
  anios_6_10: 22, anios_11_15: 24, anios_16_20: 26, anios_21_25: 28,
  anios_26_30: 30, anios_31_mas: 32,
};

export function vacationDaysForYears(
  seniorityYears: number,
  tabla?: Record<string, number>,
): number {
  const t = tabla && Object.keys(tabla).length > 0 ? tabla : VACACIONES_FALLBACK;
  // Antigüedad 0 se trata como año 1 (recién contratado ya genera derechos).
  const y = Math.max(Math.floor(seniorityYears), 1);
  if (y <= 5) return t[`anio_${y}`] ?? VACACIONES_FALLBACK[`anio_${y}`];
  if (y <= 10) return t["anios_6_10"] ?? 22;
  if (y <= 15) return t["anios_11_15"] ?? 24;
  if (y <= 20) return t["anios_16_20"] ?? 26;
  if (y <= 25) return t["anios_21_25"] ?? 28;
  if (y <= 30) return t["anios_26_30"] ?? 30;
  return t["anios_31_mas"] ?? 32;
}

/**
 * Factor de integración del SBC (LSS Art. 27): el salario cotiza CON la parte
 * proporcional del aguinaldo y de la prima vacacional. Año 1 → 1.0493.
 *
 *     factor = 1 + aguinaldo/365 + (vacaciones × prima)/365
 *
 * Misma fórmula (y mismo redondeo a 4 decimales) que el motor de nómina de
 * ContaCumple validado en producción (payroll/calculator.py::integration_factor).
 * Antes este motor NO integraba el salario → subestimaba IMSS e INFONAVIT ~5%.
 */
export function integrationFactor(
  seniorityYears: number,
  rates: Pick<FiscalRates, "AGUINALDO_DIAS" | "PRIMA_VACACIONAL" | "VACACIONES_TABLA">,
): number {
  const aguinaldo = rates.AGUINALDO_DIAS ?? 15;
  const prima = rates.PRIMA_VACACIONAL ?? 0.25;
  const vac = vacationDaysForYears(seniorityYears, rates.VACACIONES_TABLA);
  return Math.round((1 + aguinaldo / 365 + (vac * prima) / 365) * 10000) / 10000;
}

/**
 * Calcula la cuota CEAV patronal segun el SBC (tabla escalonada 2026,
 * DOF 16-dic-2020, 4to ajuste).
 *
 * La PRIMERA banda de la tabla oficial es «1 SALARIO MÍNIMO», no «1 UMA».
 * Importa porque desde 2024 el salario mínimo ($315.04 en 2026) vale más que
 * 2.5 UMA: con la llave anterior («hasta 1.00 UMA») un trabajador de salario
 * mínimo caía en la banda de 6.026% en vez de su 3.150% — la banda era código
 * muerto, porque ningún SBC legal puede estar por debajo del salario mínimo.
 */
export function ceavPatronRate(
  sbcInUma: number,
  ceavTable: Record<string, number>,
  opts?: { sbcDiario?: number; salarioMinimoDiario?: number },
): number {
  const banda1 = ceavTable["hasta_1_SM"] ?? ceavTable["hasta_1.00_UMA"] ?? 0.0315;
  if (
    opts?.sbcDiario !== undefined &&
    opts?.salarioMinimoDiario !== undefined &&
    opts.salarioMinimoDiario > 0 &&
    opts.sbcDiario <= opts.salarioMinimoDiario + 0.01
  ) {
    return banda1;
  }
  if (sbcInUma <= 1.0) return banda1;
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
  const umaDiaria = rates.UMA_DIARIA;

  // SBC INTEGRADO, con piso y tope (traído del motor de ContaCumple).
  // Antes: sbc = salario/30.4 (salario diario pelón). Eso subestimaba TODAS las
  // cuotas IMSS/INFONAVIT ~5%: el IMSS cotiza sobre el salario integrado con
  // aguinaldo y prima vacacional (LSS Art. 27), nunca por debajo del salario
  // mínimo ni por encima de 25 UMA (LSS Art. 28).
  const salarioDiario = monthlySalary / days;
  const factorIntegracion = integrationFactor(input.seniorityYears ?? 1, rates);
  const sdiDiario = salarioDiario * factorIntegracion;
  const topeDiario = (rates.SBC_TOPE_UMA ?? 25) * umaDiaria;
  const pisoDiario = rates.SALARIO_MINIMO_DIARIO ?? 0;
  const sbcDiario = Math.min(Math.max(sdiDiario, pisoDiario), topeDiario);

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

  // CEAV (patronal escalonada; la banda 1 es «1 salario mínimo», no «1 UMA»)
  const ceavRate = ceavPatronRate(sbcInUma, rates.CEAV_PATRON_TABLE, {
    sbcDiario,
    salarioMinimoDiario: pisoDiario,
  });
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

  // Provisiones LFT (aguinaldo + prima vacacional proporcional mensual).
  // = (factor de integración − 1) × salario: exactamente la parte proporcional
  // de aguinaldo (15/365) y prima vacacional (vac × 25% / 365). Año 1 ≈ 4.93%.
  // La constante anterior (0.0833 + 15/365 ≈ 12.4%) no tenía fundamento legal:
  // sobreestimaba las prestaciones al triple. Los días de vacaciones en sí NO
  // son costo extra (se pagan como salario normal trabajado, LFT Art. 76);
  // lo extra es solo la prima del 25%.
  const benefitsProvision =
    input.benefitsProvision ?? monthlySalary * (factorIntegracion - 1);

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
    sbcDiario,
    factorIntegracion,
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
