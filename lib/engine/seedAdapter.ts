/**
 * Adapter que convierte el JSON seed (17_seed_data_parametros_2026.json) en estructuras
 * tipadas que consume el motor. Se usa tanto en tests unitarios (lectura directa del JSON)
 * como en la API (lectura desde Prisma -> reshape al mismo tipo).
 */
import type { FiscalRates, IMSSRiskClass } from "./types";

interface SeedParameter {
  key: string;
  value: number | null;
  unit: string;
  table?: Record<string, number>;
}

interface SeedShape {
  parameters: SeedParameter[];
}

function getNum(seed: SeedShape, key: string, fallback?: number): number {
  const p = seed.parameters.find((x) => x.key === key);
  if (!p || p.value === null) {
    if (fallback !== undefined) return fallback;
    throw new Error(`Parametro ${key} no encontrado en seed`);
  }
  return p.value;
}

function getTable(seed: SeedShape, key: string): Record<string, number> {
  const p = seed.parameters.find((x) => x.key === key);
  if (!p || !p.table) throw new Error(`Tabla ${key} no encontrada en seed`);
  return p.table;
}

export function loadFiscalRatesFromSeed(seed: SeedShape): FiscalRates {
  const riesgo: Record<IMSSRiskClass, number> = {
    I: getNum(seed, "IMSS_RIESGO_TRABAJO_CLASE_I"),
    II: getNum(seed, "IMSS_RIESGO_TRABAJO_CLASE_II"),
    III: getNum(seed, "IMSS_RIESGO_TRABAJO_CLASE_III"),
    IV: getNum(seed, "IMSS_RIESGO_TRABAJO_CLASE_IV"),
    V: getNum(seed, "IMSS_RIESGO_TRABAJO_CLASE_V"),
  };
  return {
    IVA: getNum(seed, "IVA_GENERAL"),
    ISR: getNum(seed, "ISR_PERSONA_MORAL"),
    ISN: getNum(seed, "ISN_ZACATECAS"),
    UAZ: getNum(seed, "IMPUESTO_UAZ"),
    UMA_DIARIA: getNum(seed, "UMA_DIARIA"),
    INFONAVIT: getNum(seed, "INFONAVIT_PATRON"),
    EYM_ESPECIE_FIJA_PATRON: getNum(seed, "IMSS_EYM_ESPECIE_CUOTA_FIJA_PATRON"),
    EYM_ESPECIE_EXCEDENTE_PATRON: getNum(seed, "IMSS_EYM_ESPECIE_EXCEDENTE_PATRON"),
    EYM_ESPECIE_EXCEDENTE_OBRERO: getNum(seed, "IMSS_EYM_ESPECIE_EXCEDENTE_OBRERO"),
    EYM_DINERO_PATRON: getNum(seed, "IMSS_EYM_DINERO_PATRON"),
    EYM_DINERO_OBRERO: getNum(seed, "IMSS_EYM_DINERO_OBRERO"),
    EYM_PENSIONADOS_PATRON: getNum(seed, "IMSS_EYM_PENSIONADOS_PATRON"),
    EYM_PENSIONADOS_OBRERO: getNum(seed, "IMSS_EYM_PENSIONADOS_OBRERO"),
    IV_PATRON: getNum(seed, "IMSS_INVALIDEZ_VIDA_PATRON"),
    IV_OBRERO: getNum(seed, "IMSS_INVALIDEZ_VIDA_OBRERO"),
    GUARDERIAS_PATRON: getNum(seed, "IMSS_GUARDERIAS_PATRON"),
    RETIRO_PATRON: getNum(seed, "IMSS_RETIRO_PATRON"),
    CV_OBRERO: getNum(seed, "IMSS_CV_OBRERO"),
    RIESGO_CLASE: riesgo,
    CEAV_PATRON_TABLE: getTable(seed, "IMSS_CEAV_PATRON_2026"),
  };
}
