/**
 * Tests del motor de validación de hipótesis (FASE H).
 * Verifica que las funciones puras producen los resultados esperados
 * en datasets sintéticos controlados.
 */
import { describe, it, expect } from "vitest";
import {
  buildFeatureMatrix,
  descriptiveStats,
  correlationVsMape,
  runRegression,
  validateHypothesis,
  runFullAnalysis,
  MIN_N_FOR_REGRESSION,
  type AnalysisRow,
} from "@/lib/research/hypothesis-analysis";

function mkRow(overrides: Partial<AnalysisRow> = {}): AnalysisRow {
  const defaults: AnalysisRow = {
    projectId: "p1",
    projectName: "Proyecto X",
    devMode: "traditional",
    estHours: 100,
    actualHours: 100,
    estCostMxn: 50000,
    actualCostMxn: 50000,
    clarityAvg: 3,
    nModules: 5,
    nIntegrations: 1,
    criticalityAvg: 3,
    changesAnticipatedRatio: 1,
    fiscalDetailed: true,
    mapeHours: 0,
    mapeCost: 0,
    isAccurate: true,
  };
  return { ...defaults, ...overrides };
}

function syntheticDataset(n: number, seedNoise = 0.1): AnalysisRow[] {
  // Genera n filas donde MAPE = 40 - 5*clarity_avg + 8*(1-changes_ratio) + ruido
  // Es decir: clarity alta → menor MAPE. changes anticipados → menor MAPE.
  // Esto debe disparar veredicto "cumplida" cuando n >= 15.
  const rows: AnalysisRow[] = [];
  for (let i = 0; i < n; i++) {
    const clarityAvg = 1 + (i % 5);
    const changesRatio = (i % 3) / 3; // 0, 0.33, 0.66
    const noise = (Math.sin(i) - 0.5) * seedNoise * 10;
    const mape = Math.max(0, 40 - 5 * clarityAvg + 8 * (1 - changesRatio) + noise);
    const estH = 100;
    const actualH = mape > 0 ? estH * (1 + mape / 100) : estH;
    rows.push(mkRow({
      projectId: `p${i}`,
      projectName: `Proyecto ${i}`,
      devMode: ["traditional", "ai_assisted", "hybrid"][i % 3],
      clarityAvg,
      changesAnticipatedRatio: changesRatio,
      nModules: 3 + (i % 4),
      estHours: estH,
      actualHours: actualH,
      mapeHours: mape,
      mapeCost: mape * 0.9,
      isAccurate: mape <= 15,
    }));
  }
  return rows;
}

describe("descriptiveStats", () => {
  it("calcula media/mediana/desviación correctamente", () => {
    const stats = descriptiveStats([10, 20, 30, 40, 50]);
    expect(stats.n).toBe(5);
    expect(stats.mean).toBe(30);
    expect(stats.median).toBe(30);
    expect(stats.min).toBe(10);
    expect(stats.max).toBe(50);
    expect(stats.stddev).toBeGreaterThan(0);
  });

  it("devuelve ceros con arreglo vacío", () => {
    const stats = descriptiveStats([]);
    expect(stats.n).toBe(0);
    expect(stats.mean).toBe(0);
  });

  it("maneja un solo valor sin error", () => {
    const stats = descriptiveStats([42]);
    expect(stats.n).toBe(1);
    expect(stats.mean).toBe(42);
    expect(stats.stddev).toBe(0);
  });
});

describe("buildFeatureMatrix", () => {
  it("genera matriz X con one-hot de dev_mode", () => {
    const rows = [
      mkRow({ devMode: "traditional" }),
      mkRow({ devMode: "ai_assisted" }),
      mkRow({ devMode: "bytecoding_prompts" }),
    ];
    const { X, featureNames } = buildFeatureMatrix(rows);
    expect(featureNames).toContain("dev_mode_ai_assisted");
    expect(featureNames).toContain("dev_mode_bytecoding");
    expect(X.length).toBe(3);
    expect(X[0].length).toBe(featureNames.length);
    // traditional: todos los one-hot en 0
    const aiIdx = featureNames.indexOf("dev_mode_ai_assisted");
    expect(X[0][aiIdx]).toBe(0);
    expect(X[1][aiIdx]).toBe(1);
  });
});

describe("validateHypothesis — veredicto automático", () => {
  it("retorna datos_insuficientes con N < 15", () => {
    const rows = syntheticDataset(5);
    const verdict = validateHypothesis(rows, null, []);
    expect(verdict.verdict).toBe("datos_insuficientes");
    expect(verdict.n).toBe(5);
    expect(verdict.minSampleRequired).toBe(MIN_N_FOR_REGRESSION);
  });

  it("retorna cumplida con dataset informativo (N=30, señal fuerte)", () => {
    const rows = syntheticDataset(30, 0.05);
    const correlation = correlationVsMape(rows);
    const regression = runRegression(rows);
    const verdict = validateHypothesis(rows, regression, correlation);
    expect(["cumplida", "parcialmente_cumplida"]).toContain(verdict.verdict);
    expect(verdict.n).toBe(30);
    expect(verdict.rSquared).not.toBeNull();
  });

  it("retorna no_cumplida con ruido puro (N=30)", () => {
    // MAPE es totalmente aleatorio, no depende de features
    const rows: AnalysisRow[] = [];
    for (let i = 0; i < 30; i++) {
      const mape = Math.abs(Math.sin(i * 7.3)) * 50;
      rows.push(mkRow({
        projectId: `n${i}`,
        clarityAvg: 1 + (i % 5),
        nModules: 5,
        mapeHours: mape,
        isAccurate: mape <= 15,
      }));
    }
    const regression = runRegression(rows);
    const correlation = correlationVsMape(rows);
    const verdict = validateHypothesis(rows, regression, correlation);
    expect(["no_cumplida", "parcialmente_cumplida"]).toContain(verdict.verdict);
  });
});

describe("runRegression", () => {
  it("recupera R² razonable cuando la relación es lineal y limpia", () => {
    const rows = syntheticDataset(30, 0);
    const reg = runRegression(rows);
    expect(reg).not.toBeNull();
    expect(reg!.rSquared).toBeGreaterThan(0.5);
  });

  it("retorna null con N < umbral", () => {
    const rows = syntheticDataset(10);
    expect(runRegression(rows)).toBeNull();
  });
});

describe("correlationVsMape", () => {
  it("detecta correlación negativa fuerte cuando clarity reduce mape", () => {
    const rows = syntheticDataset(40, 0);
    const corrs = correlationVsMape(rows);
    const clarity = corrs.find((c) => c.feature === "clarity_avg");
    expect(clarity).toBeDefined();
    expect(clarity!.vsMape).toBeLessThan(0); // mayor clarity → menor MAPE
  });

  it("marca features sin varianza", () => {
    const rows: AnalysisRow[] = [];
    for (let i = 0; i < 20; i++) {
      rows.push(mkRow({ projectId: `s${i}`, clarityAvg: 3, mapeHours: 10 + i * 0.5 }));
    }
    const corrs = correlationVsMape(rows);
    const clarity = corrs.find((c) => c.feature === "clarity_avg");
    expect(clarity!.interpretation).toContain("Sin varianza");
  });
});

describe("runFullAnalysis — integración completa", () => {
  it("produce un resultado con todas las secciones cuando N >= 15", () => {
    const rows = syntheticDataset(20);
    const result = runFullAnalysis(rows);
    expect(result.n).toBe(20);
    expect(result.descriptive.mapeHours.n).toBe(20);
    expect(result.correlation.length).toBeGreaterThan(0);
    expect(result.regression).not.toBeNull();
    expect(result.classification).not.toBeNull();
    expect(result.neuralNet).not.toBeNull();
    expect(result.neuralNet!.overfittingWarning).toContain("N=20");
  });

  it("indica datos_insuficientes con N < 15", () => {
    const rows = syntheticDataset(5);
    const result = runFullAnalysis(rows);
    expect(result.hypothesis.verdict).toBe("datos_insuficientes");
    expect(result.regression).toBeNull();
    expect(result.classification).toBeNull();
  });
});
