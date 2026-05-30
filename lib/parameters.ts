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

// ============================================================
// Addendum v7 — Loader de parámetros del motor de cambios
// ============================================================
import type { ChangeImpactParameters } from "./engine/change-types";
import { DEFAULT_CHANGE_PARAMETERS } from "./engine/change-impact";

/**
 * Claves canónicas que el motor v7 espera en la tabla Parameter.
 * Si una clave no existe en DB, se usa el valor de DEFAULT_CHANGE_PARAMETERS
 * y se agrega a fallbackWarnings.
 */
const CHANGE_PARAMETER_KEYS = [
  "CHANGE_ARTIFACT_WEIGHTS",
  "CHANGE_CLARITY_FACTOR",
  "CHANGE_PHASE_FACTOR",
  "CHANGE_MODE_FACTOR",
  "CHANGE_CONTINGENCY_BY_TYPE",
  "CHANGE_HIGH_RISK_MODE_FLOOR",
  "CHANGE_MINIMUM_CHARGE_MXN",
  "CHANGE_HOURLY_RATE_DEFAULT_MXN",
  "CHANGE_FREE_CHANGE_LIMIT_MXN",
  "CHANGE_MAINTENANCE_RATE_BY_RISK",
] as const;

/**
 * Carga los parámetros del motor v7 de cambios desde la tabla Parameter,
 * con fallback seguro al default si la clave no existe.
 *
 * El llamador (endpoints /impact y /preview) debe usar esta función para
 * obtener parámetros frescos en cada cálculo (con cache de 5 min vía
 * unstable_cache de Next 15, aplicado en el endpoint, no aquí).
 *
 * @param year — año fiscal/laboral (default 2026)
 * @param state — estado (default Zacatecas; null permite parámetros nacionales)
 */
export async function loadChangeImpactParameters(
  year = DEFAULT_YEAR,
  state: string | null = DEFAULT_STATE,
): Promise<ChangeImpactParameters> {
  const rows = await prisma.parameter.findMany({
    where: {
      year,
      country: DEFAULT_COUNTRY,
      OR: state ? [{ state }, { state: null }] : [{ state: null }],
      key: { in: [...CHANGE_PARAMETER_KEYS] },
    },
  });

  const rowMap = new Map<string, string | null>();
  for (const r of rows) rowMap.set(r.key, r.value);

  const loadedKeys: string[] = [];
  const fallbackWarnings: string[] = [];

  function readJson<T>(key: string, fallback: T): T {
    const raw = rowMap.get(key);
    if (!raw) {
      fallbackWarnings.push(`${key} no encontrado en Parameter; usando default.`);
      return fallback;
    }
    try {
      loadedKeys.push(key);
      return JSON.parse(raw) as T;
    } catch {
      fallbackWarnings.push(`${key} no parseable como JSON; usando default.`);
      return fallback;
    }
  }

  function readNum(key: string, fallback: number): number {
    const raw = rowMap.get(key);
    if (raw === undefined || raw === null) {
      fallbackWarnings.push(`${key} no encontrado en Parameter; usando default.`);
      return fallback;
    }
    const n = Number.parseFloat(raw);
    if (!Number.isFinite(n)) {
      fallbackWarnings.push(`${key} no es numérico (${raw}); usando default.`);
      return fallback;
    }
    loadedKeys.push(key);
    return n;
  }

  return {
    artifactWeights: readJson("CHANGE_ARTIFACT_WEIGHTS", DEFAULT_CHANGE_PARAMETERS.artifactWeights),
    clarityFactor: readJson("CHANGE_CLARITY_FACTOR", DEFAULT_CHANGE_PARAMETERS.clarityFactor),
    phaseFactor: readJson("CHANGE_PHASE_FACTOR", DEFAULT_CHANGE_PARAMETERS.phaseFactor),
    modeFactor: readJson("CHANGE_MODE_FACTOR", DEFAULT_CHANGE_PARAMETERS.modeFactor),
    contingencyByType: readJson("CHANGE_CONTINGENCY_BY_TYPE", DEFAULT_CHANGE_PARAMETERS.contingencyByType),
    highRiskModeFloor: readNum("CHANGE_HIGH_RISK_MODE_FLOOR", DEFAULT_CHANGE_PARAMETERS.highRiskModeFloor),
    minimumChargeMxn: readNum("CHANGE_MINIMUM_CHARGE_MXN", DEFAULT_CHANGE_PARAMETERS.minimumChargeMxn),
    hourlyRateDefaultMxn: readNum("CHANGE_HOURLY_RATE_DEFAULT_MXN", DEFAULT_CHANGE_PARAMETERS.hourlyRateDefaultMxn),
    freeChangeLimitMxn: readNum("CHANGE_FREE_CHANGE_LIMIT_MXN", DEFAULT_CHANGE_PARAMETERS.freeChangeLimitMxn),
    maintenanceRateByRisk: readJson("CHANGE_MAINTENANCE_RATE_BY_RISK", DEFAULT_CHANGE_PARAMETERS.maintenanceRateByRisk),
    loadedKeys,
    fallbackWarnings,
    loadedAt: new Date().toISOString(),
  };
}
