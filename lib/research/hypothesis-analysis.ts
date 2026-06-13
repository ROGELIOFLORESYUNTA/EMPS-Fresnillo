/**
 * FASE H — Motor de validación de hipótesis EMPS-Fresnillo.
 *
 * Hipótesis: "Una estimación temprana mejora cuando integra esfuerzo
 * técnico, modo de desarrollo, cambios y viabilidad fiscal-laboral
 * antes de comprometer precio, calendario y mantenimiento."
 *
 * Operacionalización:
 *   - Variable dependiente: MAPE de horas (% de error vs real).
 *   - 4 Variables independientes (ver extractFeatures).
 *   - Veredicto automatico: cumplida / parcial / no_cumplida / insuficiente.
 *
 * Funciones puras. Sin Prisma ni Next. Recibe datos planos y devuelve
 * resultados serializables.
 */
import * as ss from "simple-statistics";
import MultivariateLinearRegression from "ml-regression-multivariate-linear";
import { RandomForestRegression } from "ml-random-forest";
import { trainMLP, predictMLP } from "./mlp";

// ============================================================
// Tipos
// ============================================================

/** Una fila plana del dataset de análisis (extraída de Prisma). */
export interface AnalysisRow {
  projectId: string;
  projectName: string;
  devMode: string;
  estHours: number;
  actualHours: number;
  estCostMxn: number;
  actualCostMxn: number;
  // Features (variables independientes)
  clarityAvg: number;          // 1..5 promedio de modulos
  nModules: number;
  nIntegrations: number;
  criticalityAvg: number;      // 1..5 promedio
  changesAnticipatedRatio: number; // 0..1+ (anticipados / reales)
  fiscalDetailed: boolean;     // costMode = "detailed"
  // Calculadas
  mapeHours: number;           // |est-actual|/actual * 100
  mapeCost: number;
  isAccurate: boolean;         // mapeHours <= 15
}

export interface DescriptiveStats {
  n: number;
  mean: number;
  median: number;
  stddev: number;
  min: number;
  max: number;
  q25: number;
  q75: number;
}

export interface CorrelationPair {
  feature: string;
  vsMape: number;          // -1..1 (negativo = mas feature => menor MAPE => mejor)
  pValueApprox: number;    // aproximacion para n grande
  interpretation: string;  // texto humano
}

export interface RegressionResult {
  rSquared: number;
  coefficients: Array<{
    feature: string;
    coef: number;
    pValueApprox: number;
    interpretation: string;
  }>;
  intercept: number;
  rmse: number;
}

export interface ClassificationResult {
  accuracy: number;
  trainSize: number;
  testSize: number;
  featureImportance: Array<{ feature: string; importance: number }>;
}

export interface NeuralNetResult {
  mapeOfPredictionVsActual: number;
  finalLoss: number;
  epochs: number;
  scatterData: Array<{ predicted: number; actual: number }>;
  overfittingWarning: string;
}

export type HypothesisVerdict =
  | "cumplida"
  | "parcialmente_cumplida"
  | "no_cumplida"
  | "datos_insuficientes";

export interface HypothesisValidation {
  verdict: HypothesisVerdict;
  reason: string;
  n: number;
  rSquared: number | null;
  significantPredictors: number;
  minSampleRequired: number;
}

/**
 * Metricas estandar de precision de estimacion, con los MISMOS nombres del
 * articulo 1 (Conte et al. 1986 / IFPUG). Se calculan sobre el MRE = |est-real|/real.
 *   MMRE  = media del MRE
 *   MdMRE = mediana del MRE (robusta a outliers)
 *   PRED(x) = fraccion de proyectos con MRE <= x
 */
export interface MetricsSummary {
  n: number;
  mmreHours: number;     // 0..1+ (media del MRE de horas)
  mdmreHours: number;    // 0..1+ (mediana)
  pred15: number;        // 0..1 (fraccion dentro de +/-15%)
  pred30: number;        // 0..1 (fraccion dentro de +/-30%)
  mmreCost: number;
  mdmreCost: number;
  nAccurate15: number;
}

/**
 * Comparacion de dos grupos con la U de Mann-Whitney (no parametrica).
 * Aqui: MAPE de proyectos con estimacion fiscal integral vs estimacion simple.
 */
export interface GroupComparison {
  label: string;
  groupAName: string;
  groupBName: string;
  nA: number;
  nB: number;
  medianA: number;       // mediana del MAPE grupo A
  medianB: number;       // mediana del MAPE grupo B
  u: number;             // estadistico U
  pValueApprox: number;  // aproximacion normal
  significant: boolean;  // p < 0.05
  interpretation: string;
}

export interface FullAnalysisResult {
  generatedAt: string;
  n: number;
  features: string[];
  metricsSummary: MetricsSummary;
  descriptive: {
    mapeHours: DescriptiveStats;
    mapeCost: DescriptiveStats;
    accuracyRate: number; // % de proyectos con mapeHours <= 15
  };
  correlation: CorrelationPair[];
  groupComparison: GroupComparison | null;
  regression: RegressionResult | null;
  classification: ClassificationResult | null;
  neuralNet: NeuralNetResult | null;
  hypothesis: HypothesisValidation;
}

// ============================================================
// Constantes umbral
// ============================================================

const MIN_N_FOR_REGRESSION = 15;
const RSQ_CUMPLIDA = 0.35;
const RSQ_PARCIAL = 0.15;
const ACCURACY_THRESHOLD_MAPE = 15; // % IFPUG estandar
const P_VALUE_SIGNIFICANCE = 0.05;

// ============================================================
// Feature extraction
// ============================================================

const FEATURE_NAMES = [
  "clarity_avg",
  "n_modules",
  "n_integrations",
  "criticality_avg",
  "changes_anticipated_ratio",
  "fiscal_detailed",
  "dev_mode_ai_assisted",
  "dev_mode_hybrid",
  "dev_mode_bytecoding",
  "dev_mode_low_code",
];

/** Convierte filas en matriz X (numerica, con one-hot de devMode) + vector y (MAPE). */
export function buildFeatureMatrix(rows: AnalysisRow[]): {
  X: number[][];
  y: number[];
  yBinary: number[];
  featureNames: string[];
} {
  const X: number[][] = [];
  const y: number[] = [];
  const yBinary: number[] = [];
  for (const r of rows) {
    const oneHot = [
      r.devMode === "ai_assisted" ? 1 : 0,
      r.devMode === "hybrid" ? 1 : 0,
      r.devMode === "bytecoding_prompts" ? 1 : 0,
      r.devMode === "low_code" ? 1 : 0,
    ];
    X.push([
      r.clarityAvg,
      r.nModules,
      r.nIntegrations,
      r.criticalityAvg,
      r.changesAnticipatedRatio,
      r.fiscalDetailed ? 1 : 0,
      ...oneHot,
    ]);
    y.push(r.mapeHours);
    yBinary.push(r.isAccurate ? 1 : 0);
  }
  return { X, y, yBinary, featureNames: FEATURE_NAMES };
}

// ============================================================
// Estadistica descriptiva
// ============================================================

export function descriptiveStats(values: number[]): DescriptiveStats {
  if (values.length === 0) {
    return { n: 0, mean: 0, median: 0, stddev: 0, min: 0, max: 0, q25: 0, q75: 0 };
  }
  return {
    n: values.length,
    mean: ss.mean(values),
    median: ss.median(values),
    stddev: values.length >= 2 ? ss.standardDeviation(values) : 0,
    min: ss.min(values),
    max: ss.max(values),
    q25: ss.quantile(values, 0.25),
    q75: ss.quantile(values, 0.75),
  };
}

// ============================================================
// Correlacion (Pearson) + p-value aproximado
// ============================================================

/** Aproxima p-value para correlación de Pearson usando t-test. */
function correlationPValue(r: number, n: number): number {
  if (n < 3) return 1;
  if (Math.abs(r) >= 0.9999) return 0;
  const t = (r * Math.sqrt(n - 2)) / Math.sqrt(1 - r * r);
  // CDF de t-student aproximada con normal para n grande (>30)
  // Para tesis es aceptable; el notebook Python usa scipy.stats.t exact.
  const df = n - 2;
  const x = df / (df + t * t);
  return Math.min(1, Math.max(0, x ** (df / 2))); // muy aproximado
}

function interpretCorrelation(feature: string, r: number, p: number): string {
  const sig = p < P_VALUE_SIGNIFICANCE ? "significativa" : "no significativa";
  const dir =
    r < -0.3 ? "reduce el MAPE (mejora la estimación)" :
    r > 0.3 ? "aumenta el MAPE (empeora la estimación)" :
    "no parece tener impacto claro en el MAPE";
  return `Correlación ${sig} (r=${r.toFixed(2)}, p≈${p.toFixed(3)}); ${dir}.`;
}

export function correlationVsMape(rows: AnalysisRow[]): CorrelationPair[] {
  if (rows.length < 3) return [];
  const { X, y, featureNames } = buildFeatureMatrix(rows);
  const out: CorrelationPair[] = [];
  for (let j = 0; j < featureNames.length; j++) {
    const col = X.map((row) => row[j]);
    // Saltar features sin varianza (todos 0 o todos 1)
    const variance = ss.variance(col);
    if (variance === 0) {
      out.push({
        feature: featureNames[j],
        vsMape: 0,
        pValueApprox: 1,
        interpretation: "Sin varianza en los datos (todos los proyectos tienen el mismo valor).",
      });
      continue;
    }
    const r = ss.sampleCorrelation(col, y);
    const p = correlationPValue(r, rows.length);
    out.push({
      feature: featureNames[j],
      vsMape: Number(r.toFixed(4)),
      pValueApprox: Number(p.toFixed(4)),
      interpretation: interpretCorrelation(featureNames[j], r, p),
    });
  }
  return out;
}

// ============================================================
// Regresion lineal multivariable
// ============================================================

function interpretCoef(feature: string, coef: number): string {
  const sign = coef < 0 ? "reduce" : "aumenta";
  return `Cada unidad de ${feature} ${sign} el MAPE en ~${Math.abs(coef).toFixed(2)} puntos.`;
}

export function runRegression(rows: AnalysisRow[]): RegressionResult | null {
  if (rows.length < MIN_N_FOR_REGRESSION) return null;
  const { X, y, featureNames } = buildFeatureMatrix(rows);
  const Y = y.map((v) => [v]);
  const reg = new MultivariateLinearRegression(X, Y, { intercept: true });
  const yPred = X.map((row) => reg.predict(row)[0]);
  const rmse = Math.sqrt(ss.mean(yPred.map((p, i) => (p - y[i]) ** 2)));
  // R² calculado manualmente para certeza
  const yMean = ss.mean(y);
  const ssTotal = y.reduce((a, v) => a + (v - yMean) ** 2, 0);
  const ssRes = y.reduce((a, v, i) => a + (v - yPred[i]) ** 2, 0);
  const rSquared = ssTotal === 0 ? 0 : 1 - ssRes / ssTotal;

  // Coeficientes: ml-regression devuelve weights[input][output]
  // p-value aproximado por bootstrap simple para no requerir libreria stats
  const weights = (reg as unknown as { weights: number[][] }).weights;
  const intercept = weights[weights.length - 1][0];
  const coefArr = weights.slice(0, -1).map((w) => w[0]);

  // p-value aproximado: residuo / error estandar (Wald approximacion)
  const residualVar = ssRes / Math.max(1, rows.length - featureNames.length - 1);
  const coefficients = coefArr.map((coef, j) => {
    const col = X.map((row) => row[j]);
    const colVar = ss.variance(col);
    if (colVar === 0) {
      return { feature: featureNames[j], coef: 0, pValueApprox: 1, interpretation: "Sin varianza." };
    }
    const seCoef = Math.sqrt(residualVar / (rows.length * colVar));
    const tStat = seCoef === 0 ? 0 : coef / seCoef;
    const p = correlationPValue(Math.min(0.999, Math.abs(tStat) / (Math.abs(tStat) + 1)), rows.length);
    return {
      feature: featureNames[j],
      coef: Number(coef.toFixed(4)),
      pValueApprox: Number(p.toFixed(4)),
      interpretation: interpretCoef(featureNames[j], coef),
    };
  });

  return {
    rSquared: Number(rSquared.toFixed(4)),
    coefficients,
    intercept: Number(intercept.toFixed(4)),
    rmse: Number(rmse.toFixed(4)),
  };
}

// ============================================================
// Clasificacion ML (Random Forest)
// ============================================================

export function runClassification(rows: AnalysisRow[]): ClassificationResult | null {
  if (rows.length < MIN_N_FOR_REGRESSION) return null;
  const { X, yBinary, featureNames } = buildFeatureMatrix(rows);

  // Split 70/30 random
  const idx = X.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  const cut = Math.floor(idx.length * 0.7);
  const trainIdx = idx.slice(0, cut);
  const testIdx = idx.slice(cut);
  const Xtrain = trainIdx.map((i) => X[i]);
  const ytrain = trainIdx.map((i) => yBinary[i]);
  const Xtest = testIdx.map((i) => X[i]);
  const ytest = testIdx.map((i) => yBinary[i]);

  const rf = new RandomForestRegression({
    nEstimators: 50,
    seed: 42,
    maxFeatures: 0.8,
    treeOptions: { maxDepth: 6, minNumSamples: 2 },
  });
  rf.train(Xtrain, ytrain);
  const preds = rf.predict(Xtest);
  const predBinary = preds.map((p: number) => (p >= 0.5 ? 1 : 0));
  const correct = predBinary.filter((p: number, i: number) => p === ytest[i]).length;
  const accuracy = ytest.length === 0 ? 0 : correct / ytest.length;

  // Feature importance heuristico: aleatoriza cada feature y mide caida de accuracy
  const baseAcc = accuracy;
  const featureImportance = featureNames.map((feat, j) => {
    const Xshuf = Xtest.map((row) => [...row]);
    // Permutar columna j
    const colVals = Xshuf.map((r) => r[j]);
    for (let i = colVals.length - 1; i > 0; i--) {
      const k = Math.floor(Math.random() * (i + 1));
      [colVals[i], colVals[k]] = [colVals[k], colVals[i]];
    }
    Xshuf.forEach((r, i) => (r[j] = colVals[i]));
    const shufPreds = rf.predict(Xshuf).map((p: number) => (p >= 0.5 ? 1 : 0));
    const shufCorrect = shufPreds.filter((p: number, i: number) => p === ytest[i]).length;
    const shufAcc = ytest.length === 0 ? 0 : shufCorrect / ytest.length;
    return { feature: feat, importance: Number((baseAcc - shufAcc).toFixed(4)) };
  }).sort((a, b) => b.importance - a.importance);

  return {
    accuracy: Number(accuracy.toFixed(4)),
    trainSize: Xtrain.length,
    testSize: Xtest.length,
    featureImportance,
  };
}

// ============================================================
// Red neuronal (MLP)
// ============================================================

const MLP_OVERFITTING_WARN_N = 100;

export function runNeuralNet(rows: AnalysisRow[]): NeuralNetResult | null {
  if (rows.length < MIN_N_FOR_REGRESSION) return null;
  const { X, y } = buildFeatureMatrix(rows);

  // Normalizar features (z-score) para que la red converja
  const means = X[0].map((_, j) => ss.mean(X.map((r) => r[j])));
  const stds = X[0].map((_, j) => {
    const sd = ss.standardDeviation(X.map((r) => r[j]));
    return sd === 0 ? 1 : sd;
  });
  const Xn = X.map((row) => row.map((v, j) => (v - means[j]) / stds[j]));

  const { state, lossHistory } = trainMLP(Xn, y, {
    inputSize: X[0].length,
    hiddenSize: Math.min(8, Math.floor(rows.length / 3)),
    learningRate: 0.001,
    epochs: 200,
  });
  const preds = predictMLP(state, Xn);
  const scatterData = preds.map((p, i) => ({ predicted: Number(p.toFixed(2)), actual: y[i] }));
  const mapePred = ss.mean(preds.map((p, i) => Math.abs(p - y[i])));

  return {
    mapeOfPredictionVsActual: Number(mapePred.toFixed(2)),
    finalLoss: Number(lossHistory[lossHistory.length - 1].toFixed(4)),
    epochs: 200,
    scatterData,
    overfittingWarning:
      rows.length < MLP_OVERFITTING_WARN_N
        ? `Red neuronal entrenada con N=${rows.length}. Con menos de ${MLP_OVERFITTING_WARN_N} casos hay alto riesgo de sobreajuste. La evidencia principal para el artículo es la regresión multivariable, NO la red neuronal.`
        : `Red neuronal entrenada con N=${rows.length}. Es una muestra razonable; aún así reporta esta sección como complemento, no como prueba definitiva.`,
  };
}

// ============================================================
// Veredicto de la hipotesis
// ============================================================

export function validateHypothesis(
  rows: AnalysisRow[],
  regression: RegressionResult | null,
  correlation: CorrelationPair[],
): HypothesisValidation {
  const n = rows.length;
  if (n < MIN_N_FOR_REGRESSION) {
    return {
      verdict: "datos_insuficientes",
      reason: `Solo hay ${n} casos con resultado real capturado. Para validar la hipótesis con regresión multivariable se necesitan al menos ${MIN_N_FOR_REGRESSION} casos. Sigue capturando ProjectActualResult en proyectos cerrados.`,
      n,
      rSquared: null,
      significantPredictors: 0,
      minSampleRequired: MIN_N_FOR_REGRESSION,
    };
  }
  if (!regression) {
    return {
      verdict: "datos_insuficientes",
      reason: "No se pudo entrenar la regresión (probablemente por singularidades en los datos).",
      n,
      rSquared: null,
      significantPredictors: 0,
      minSampleRequired: MIN_N_FOR_REGRESSION,
    };
  }
  const sigCount = correlation.filter((c) => c.pValueApprox < P_VALUE_SIGNIFICANCE && Math.abs(c.vsMape) > 0.1).length;
  const r2 = regression.rSquared;
  if (r2 >= RSQ_CUMPLIDA && sigCount >= 2) {
    return {
      verdict: "cumplida",
      reason: `La regresión explica ${(r2 * 100).toFixed(1)}% de la varianza del MAPE (R²=${r2.toFixed(2)}) y ${sigCount} variables independientes son significativas (p<0.05). La evidencia respalda la hipótesis: integrar las 4 dimensiones mejora la precisión.`,
      n,
      rSquared: r2,
      significantPredictors: sigCount,
      minSampleRequired: MIN_N_FOR_REGRESSION,
    };
  }
  if (r2 >= RSQ_PARCIAL || sigCount >= 1) {
    return {
      verdict: "parcialmente_cumplida",
      reason: `La regresión explica ${(r2 * 100).toFixed(1)}% de la varianza con ${sigCount} predictor(es) significativo(s). La hipótesis se cumple PARCIALMENTE: algunas dimensiones impactan, otras no. Recomendable: aumentar N y analizar por subgrupos.`,
      n,
      rSquared: r2,
      significantPredictors: sigCount,
      minSampleRequired: MIN_N_FOR_REGRESSION,
    };
  }
  return {
    verdict: "no_cumplida",
    reason: `La regresión solo explica ${(r2 * 100).toFixed(1)}% de la varianza y ningún predictor es significativo. Los datos NO respaldan la hipótesis con la operacionalización actual. Considera: revisar la captura de datos, repensar las variables independientes, o ampliar N.`,
    n,
    rSquared: r2,
    significantPredictors: sigCount,
    minSampleRequired: MIN_N_FOR_REGRESSION,
  };
}

// ============================================================
// Metricas del articulo (MMRE / MdMRE / PRED) + Mann-Whitney
// ============================================================

/** MRE de una fila = MAPE/100 (porque mapeHours ya viene *100). */
export function metricsSummary(rows: AnalysisRow[]): MetricsSummary {
  if (rows.length === 0) {
    return { n: 0, mmreHours: 0, mdmreHours: 0, pred15: 0, pred30: 0, mmreCost: 0, mdmreCost: 0, nAccurate15: 0 };
  }
  const mreHours = rows.map((r) => r.mapeHours / 100);
  const mreCost = rows.filter((r) => r.mapeCost > 0).map((r) => r.mapeCost / 100);
  const within = (arr: number[], thr: number) => arr.filter((v) => v <= thr).length / arr.length;
  return {
    n: rows.length,
    mmreHours: Number(ss.mean(mreHours).toFixed(4)),
    mdmreHours: Number(ss.median(mreHours).toFixed(4)),
    pred15: Number(within(mreHours, 0.15).toFixed(4)),
    pred30: Number(within(mreHours, 0.30).toFixed(4)),
    mmreCost: mreCost.length ? Number(ss.mean(mreCost).toFixed(4)) : 0,
    mdmreCost: mreCost.length ? Number(ss.median(mreCost).toFixed(4)) : 0,
    nAccurate15: rows.filter((r) => r.isAccurate).length,
  };
}

/** Rangos promedio (empates promediados) sobre el arreglo combinado. */
function averageRanks(values: number[]): number[] {
  const idx = values.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
  const ranks = new Array<number>(values.length);
  let k = 0;
  while (k < idx.length) {
    let j = k;
    while (j + 1 < idx.length && idx[j + 1].v === idx[k].v) j++;
    const avg = (k + 1 + (j + 1)) / 2; // rangos 1-based
    for (let m = k; m <= j; m++) ranks[idx[m].i] = avg;
    k = j + 1;
  }
  return ranks;
}

/** U de Mann-Whitney con aproximacion normal (con correccion de continuidad). */
export function mannWhitneyU(a: number[], b: number[]): { u: number; pValueApprox: number } {
  const nA = a.length;
  const nB = b.length;
  if (nA === 0 || nB === 0) return { u: 0, pValueApprox: 1 };
  const all = [...a, ...b];
  const ranks = averageRanks(all);
  const rankSumA = ranks.slice(0, nA).reduce((s, r) => s + r, 0);
  const uA = rankSumA - (nA * (nA + 1)) / 2;
  const uB = nA * nB - uA;
  const u = Math.min(uA, uB);
  const meanU = (nA * nB) / 2;
  const sdU = Math.sqrt((nA * nB * (nA + nB + 1)) / 12);
  if (sdU === 0) return { u, pValueApprox: 1 };
  const z = (Math.abs(u - meanU) - 0.5) / sdU; // correccion de continuidad
  // p de dos colas via funcion de error
  const p = 2 * (1 - normalCdf(z));
  return { u: Number(u.toFixed(2)), pValueApprox: Number(Math.min(1, Math.max(0, p)).toFixed(4)) };
}

function normalCdf(z: number): number {
  // Aproximacion de Abramowitz-Stegun para la CDF normal estandar.
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp(-z * z / 2);
  const prob =
    d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - prob : prob;
}

/** Compara el MAPE de horas entre estimacion fiscal integral vs simple. */
export function compareByFiscalDetail(rows: AnalysisRow[]): GroupComparison | null {
  const a = rows.filter((r) => r.fiscalDetailed).map((r) => r.mapeHours);
  const b = rows.filter((r) => !r.fiscalDetailed).map((r) => r.mapeHours);
  if (a.length < 3 || b.length < 3) return null;
  const { u, pValueApprox } = mannWhitneyU(a, b);
  const medianA = Number(ss.median(a).toFixed(2));
  const medianB = Number(ss.median(b).toFixed(2));
  const significant = pValueApprox < P_VALUE_SIGNIFICANCE;
  const dir = medianA < medianB ? "menor" : medianA > medianB ? "mayor" : "igual";
  const interpretation = significant
    ? `Diferencia significativa (p≈${pValueApprox.toFixed(3)}): la estimacion fiscal integral tiene un MAPE mediano ${dir} (${medianA}% vs ${medianB}%).`
    : `Sin diferencia significativa (p≈${pValueApprox.toFixed(3)}) entre estimacion integral (mediana ${medianA}%) y simple (mediana ${medianB}%). Con N pequeno, reportar como resultado preliminar.`;
  return {
    label: "MAPE: estimacion fiscal integral vs simple",
    groupAName: "fiscal_detailed=si",
    groupBName: "fiscal_detailed=no",
    nA: a.length,
    nB: b.length,
    medianA,
    medianB,
    u,
    pValueApprox,
    significant,
    interpretation,
  };
}

// ============================================================
// Orquestador
// ============================================================

export function runFullAnalysis(rows: AnalysisRow[]): FullAnalysisResult {
  const mapeHours = rows.map((r) => r.mapeHours);
  const mapeCost = rows.map((r) => r.mapeCost);
  const accurateCount = rows.filter((r) => r.isAccurate).length;

  const correlation = correlationVsMape(rows);
  const groupComparison = compareByFiscalDetail(rows);
  const regression = runRegression(rows);
  const classification = runClassification(rows);
  const neuralNet = runNeuralNet(rows);
  const hypothesis = validateHypothesis(rows, regression, correlation);

  return {
    generatedAt: new Date().toISOString(),
    n: rows.length,
    features: FEATURE_NAMES,
    metricsSummary: metricsSummary(rows),
    descriptive: {
      mapeHours: descriptiveStats(mapeHours),
      mapeCost: descriptiveStats(mapeCost),
      accuracyRate: rows.length === 0 ? 0 : Number((accurateCount / rows.length).toFixed(4)),
    },
    correlation,
    groupComparison,
    regression,
    classification,
    neuralNet,
    hypothesis,
  };
}

export {
  MIN_N_FOR_REGRESSION,
  RSQ_CUMPLIDA,
  RSQ_PARCIAL,
  ACCURACY_THRESHOLD_MAPE,
  FEATURE_NAMES,
};
