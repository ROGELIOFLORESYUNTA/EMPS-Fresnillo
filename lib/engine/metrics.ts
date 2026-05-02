/**
 * Metricas de validacion cientifica (addendum 25).
 * Compara una estimacion contra el resultado real registrado en ProjectActualResult.
 *
 * Las 6 metricas:
 *   1. effortError       - Diferencia absoluta entre horas estimadas y reales.
 *   2. costError         - Diferencia absoluta entre costo estimado y real.
 *   3. rangeCoverage     - Si el resultado real cayo dentro de [optimista, conservador].
 *   4. riskDetected      - Si el sistema anticipo cambios/flujo negativo/mantenimiento.
 *   5. modeDifference    - Variacion del esfuerzo entre traditional/ai_assisted/bytecoding.
 *   6. explainability    - Si la estimacion guardo parametros snapshot + breakdown por fase.
 */

export interface ScientificMetricsInput {
  // Estimaciones del sistema (3 escenarios)
  optimisticHours: number;
  probableHours: number;
  conservativeHours: number;
  optimisticCost: number;
  probableCost: number;
  conservativeCost: number;

  // Resultado real
  actualHours?: number;
  actualCost?: number;
  actualChangeCount?: number;
  actualMaintenanceCost?: number;

  // Predicciones de riesgo del sistema
  predictedChangeProbability: number;       // 0..1
  predictedWorkingCapitalRequired: number;
  predictedMaintenanceCost: number;

  // Capacidad de explicacion
  hasParametersSnapshot: boolean;
  hasPhaseBreakdown: boolean;

  // Comparacion entre modos (cuando se calcularon multiples)
  modeEffortMap?: Record<string, number>;   // ej. { traditional: 1000, ai_assisted: 850, bytecoding_prompts: 1100 }
}

export interface ScientificMetricsResult {
  effortError?: { abs: number; pct: number };
  costError?: { abs: number; pct: number };
  rangeCoverage?: { effortInRange: boolean; costInRange: boolean };
  riskDetected: {
    changes: "anticipated" | "missed" | "n/a";
    workingCapital: "anticipated" | "n/a";
    maintenance: "anticipated" | "underestimated" | "n/a";
  };
  modeDifference?: {
    range: number;        // diferencia max-min en horas
    rangePct: number;     // como % sobre el promedio
    fastestMode: string;
    slowestMode: string;
  };
  explainability: {
    hasSnapshot: boolean;
    hasBreakdown: boolean;
    score: number;        // 0..1
  };
}

export function computeScientificMetrics(input: ScientificMetricsInput): ScientificMetricsResult {
  const result: ScientificMetricsResult = {
    riskDetected: { changes: "n/a", workingCapital: "n/a", maintenance: "n/a" },
    explainability: {
      hasSnapshot: input.hasParametersSnapshot,
      hasBreakdown: input.hasPhaseBreakdown,
      score: (input.hasParametersSnapshot ? 0.5 : 0) + (input.hasPhaseBreakdown ? 0.5 : 0),
    },
  };

  // 1. Effort error
  if (input.actualHours !== undefined) {
    const diff = Math.abs(input.actualHours - input.probableHours);
    result.effortError = {
      abs: diff,
      pct: input.actualHours > 0 ? diff / input.actualHours : 0,
    };
  }

  // 2. Cost error
  if (input.actualCost !== undefined) {
    const diff = Math.abs(input.actualCost - input.probableCost);
    result.costError = {
      abs: diff,
      pct: input.actualCost > 0 ? diff / input.actualCost : 0,
    };
  }

  // 3. Range coverage
  if (input.actualHours !== undefined || input.actualCost !== undefined) {
    result.rangeCoverage = {
      effortInRange:
        input.actualHours !== undefined &&
        input.actualHours >= input.optimisticHours &&
        input.actualHours <= input.conservativeHours,
      costInRange:
        input.actualCost !== undefined &&
        input.actualCost >= input.optimisticCost &&
        input.actualCost <= input.conservativeCost,
    };
  }

  // 4. Risk detected
  if (input.actualChangeCount !== undefined) {
    if (input.actualChangeCount > 0 && input.predictedChangeProbability >= 0.20) {
      result.riskDetected.changes = "anticipated";
    } else if (input.actualChangeCount > 0) {
      result.riskDetected.changes = "missed";
    }
  }
  if (input.predictedWorkingCapitalRequired > 0) {
    result.riskDetected.workingCapital = "anticipated";
  }
  if (input.actualMaintenanceCost !== undefined) {
    if (input.predictedMaintenanceCost >= input.actualMaintenanceCost) {
      result.riskDetected.maintenance = "anticipated";
    } else {
      result.riskDetected.maintenance = "underestimated";
    }
  }

  // 5. Mode difference
  if (input.modeEffortMap) {
    const values = Object.values(input.modeEffortMap);
    if (values.length >= 2) {
      const max = Math.max(...values);
      const min = Math.min(...values);
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      const fastestMode =
        Object.entries(input.modeEffortMap).find(([, v]) => v === min)?.[0] ?? "";
      const slowestMode =
        Object.entries(input.modeEffortMap).find(([, v]) => v === max)?.[0] ?? "";
      result.modeDifference = {
        range: max - min,
        rangePct: avg > 0 ? (max - min) / avg : 0,
        fastestMode,
        slowestMode,
      };
    }
  }

  return result;
}
