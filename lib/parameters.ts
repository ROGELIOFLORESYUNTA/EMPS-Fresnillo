/**
 * Carga de parametros desde la base de datos.
 * Convierte registros Parameter en estructuras tipadas que consume el motor.
 */
import { prisma } from "./db";
import type { FiscalRates, IMSSRiskClass, DevModeFactors, DevModeVelocity, ScenarioFactors } from "./engine/types";

const DEFAULT_YEAR = Number.parseInt(process.env.DEFAULT_FISCAL_YEAR ?? "2026", 10);
const DEFAULT_COUNTRY = process.env.DEFAULT_COUNTRY ?? "Mexico";
const DEFAULT_STATE = process.env.DEFAULT_STATE ?? "Zacatecas";

interface LoadedParam {
  key: string;
  value: string | null;
  unit: string;
  source: string;
  sourceUrl: string | null;
  effectiveFrom: Date;
  effectiveUntil: Date | null;
  notes: string | null;
}

async function loadAllForYear(year = DEFAULT_YEAR): Promise<LoadedParam[]> {
  const rows = await prisma.parameter.findMany({
    where: {
      year,
      country: DEFAULT_COUNTRY,
      OR: [{ state: DEFAULT_STATE }, { state: null }],
    },
  });
  return rows.map((r) => ({
    key: r.key,
    value: r.value,
    unit: r.unit,
    source: r.source,
    sourceUrl: r.sourceUrl,
    effectiveFrom: r.effectiveFrom,
    effectiveUntil: r.effectiveUntil,
    notes: r.notes,
  }));
}

function getNum(rows: LoadedParam[], key: string): number {
  const row = rows.find((r) => r.key === key);
  if (!row || row.value === null) throw new Error(`Parametro ${key} no encontrado`);
  const n = Number.parseFloat(row.value);
  if (!Number.isFinite(n)) throw new Error(`Parametro ${key} no es numerico: ${row.value}`);
  return n;
}

function getJson<T>(rows: LoadedParam[], key: string): T {
  const row = rows.find((r) => r.key === key);
  if (!row || !row.value) throw new Error(`Parametro JSON ${key} no encontrado`);
  return JSON.parse(row.value) as T;
}

export async function loadFiscalRates(year = DEFAULT_YEAR): Promise<FiscalRates> {
  const rows = await loadAllForYear(year);
  const ceavTable = getJson<{ table: Record<string, number> }>(rows, "IMSS_CEAV_PATRON_2026").table
    ?? getJson<Record<string, number>>(rows, "IMSS_CEAV_PATRON_2026");

  const riesgo: Record<IMSSRiskClass, number> = {
    I: getNum(rows, "IMSS_RIESGO_TRABAJO_CLASE_I"),
    II: getNum(rows, "IMSS_RIESGO_TRABAJO_CLASE_II"),
    III: getNum(rows, "IMSS_RIESGO_TRABAJO_CLASE_III"),
    IV: getNum(rows, "IMSS_RIESGO_TRABAJO_CLASE_IV"),
    V: getNum(rows, "IMSS_RIESGO_TRABAJO_CLASE_V"),
  };

  return {
    IVA: getNum(rows, "IVA_GENERAL"),
    ISR: getNum(rows, "ISR_PERSONA_MORAL"),
    ISN: getNum(rows, "ISN_ZACATECAS"),
    UAZ: getNum(rows, "IMPUESTO_UAZ"),
    UMA_DIARIA: getNum(rows, "UMA_DIARIA"),
    INFONAVIT: getNum(rows, "INFONAVIT_PATRON"),
    EYM_ESPECIE_FIJA_PATRON: getNum(rows, "IMSS_EYM_ESPECIE_CUOTA_FIJA_PATRON"),
    EYM_ESPECIE_EXCEDENTE_PATRON: getNum(rows, "IMSS_EYM_ESPECIE_EXCEDENTE_PATRON"),
    EYM_ESPECIE_EXCEDENTE_OBRERO: getNum(rows, "IMSS_EYM_ESPECIE_EXCEDENTE_OBRERO"),
    EYM_DINERO_PATRON: getNum(rows, "IMSS_EYM_DINERO_PATRON"),
    EYM_DINERO_OBRERO: getNum(rows, "IMSS_EYM_DINERO_OBRERO"),
    EYM_PENSIONADOS_PATRON: getNum(rows, "IMSS_EYM_PENSIONADOS_PATRON"),
    EYM_PENSIONADOS_OBRERO: getNum(rows, "IMSS_EYM_PENSIONADOS_OBRERO"),
    IV_PATRON: getNum(rows, "IMSS_INVALIDEZ_VIDA_PATRON"),
    IV_OBRERO: getNum(rows, "IMSS_INVALIDEZ_VIDA_OBRERO"),
    GUARDERIAS_PATRON: getNum(rows, "IMSS_GUARDERIAS_PATRON"),
    RETIRO_PATRON: getNum(rows, "IMSS_RETIRO_PATRON"),
    CV_OBRERO: getNum(rows, "IMSS_CV_OBRERO"),
    RIESGO_CLASE: riesgo,
    CEAV_PATRON_TABLE: ceavTable,
  };
}

export async function loadDevModeFactors(year = DEFAULT_YEAR): Promise<DevModeFactors> {
  const rows = await loadAllForYear(year);
  return getJson<DevModeFactors>(rows, "DEV_MODE_FACTORS");
}

export async function loadDevModeVelocity(year = DEFAULT_YEAR): Promise<DevModeVelocity> {
  const rows = await loadAllForYear(year);
  return getJson<DevModeVelocity>(rows, "DEV_MODE_VELOCITY");
}

export async function loadScenarioFactors(year = DEFAULT_YEAR): Promise<ScenarioFactors> {
  const rows = await loadAllForYear(year);
  return getJson<ScenarioFactors>(rows, "SCENARIO_FACTORS");
}

export async function loadAllForEstimate(year = DEFAULT_YEAR) {
  const [rates, factors, velocity, scenarios, raw] = await Promise.all([
    loadFiscalRates(year),
    loadDevModeFactors(year),
    loadDevModeVelocity(year),
    loadScenarioFactors(year),
    loadAllForYear(year),
  ]);
  return { rates, factors, velocity, scenarios, snapshot: raw };
}

/**
 * Snapshot serializable de los parametros usados para auditoria (RNF-03).
 */
export function buildParametersSnapshot(rows: LoadedParam[]): string {
  return JSON.stringify({
    capturedAt: new Date().toISOString(),
    parameters: rows.map((r) => ({
      key: r.key,
      value: r.value,
      unit: r.unit,
      source: r.source,
      sourceUrl: r.sourceUrl,
      effectiveFrom: r.effectiveFrom.toISOString(),
    })),
  });
}
