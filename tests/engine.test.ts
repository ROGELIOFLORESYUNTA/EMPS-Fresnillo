/**
 * Tests del motor de estimacion.
 * Cubre los 5 casos del 12_plan_pruebas.md:
 *  Caso 1: Proyecto simple (CRUD interno, 3 modulos, sin datos sensibles).
 *  Caso 2: Proyecto municipal medio (8 modulos, reportes, datos personales).
 *  Caso 3: Proyecto con integracion compleja.
 *  Caso 4: Proveedor con cobro al final (sin anticipo).
 *  Caso 5: Cambio de alcance (validacion de no sobrescritura).
 */
import { describe, it, expect } from "vitest";
import {
  computeEffort,
  computeScenarios,
  computeCalendar,
  computeProfileCost,
  computePricing,
  computeISR,
  buildSimpleCashFlow,
  computeRisk,
  loadFiscalRatesFromSeed,
  type ProjectInput,
  type DevModeFactors,
  type DevModeVelocity,
  type ScenarioFactors,
  type DevelopmentMode,
} from "@/lib/engine";
import seed from "@/17_seed_data_parametros_2026.json";

const factors = seed.development_mode_factors as unknown as DevModeFactors;
const velocity = seed.development_mode_velocity as unknown as DevModeVelocity;
const scenarios = seed.scenario_factors as unknown as ScenarioFactors;
const fiscal = loadFiscalRatesFromSeed(seed as { parameters: { key: string; value: number | null; unit: string; table?: Record<string, number> }[] });

// ----- Helpers -----

function caso1(): ProjectInput {
  return {
    modules: [
      { complexity: 2, clarity: 4, criticality: 3, screensCount: 3, reportsCount: 1, integrationsCount: 0, sensitiveData: false },
      { complexity: 3, clarity: 4, criticality: 3, screensCount: 5, reportsCount: 2, integrationsCount: 0, sensitiveData: false },
      { complexity: 2, clarity: 4, criticality: 2, screensCount: 1, reportsCount: 3, integrationsCount: 0, sensitiveData: false },
    ],
    dataMigration: false,
    externalIntegrationsCount: 0,
    changeProbability: 0.10,
    clientUnavailability: 0.10,
    turnoverRisk: 0.10,
    clientAvailability: 0.90,
  };
}

function caso2(): ProjectInput {
  return {
    modules: Array.from({ length: 8 }, (_, i) => ({
      complexity: 3,
      clarity: 3,
      criticality: 3,
      screensCount: 4,
      reportsCount: 2,
      integrationsCount: i < 2 ? 1 : 0,
      sensitiveData: i < 4,
    })),
    dataMigration: true,
    externalIntegrationsCount: 2,
    changeProbability: 0.20,
    clientUnavailability: 0.20,
    turnoverRisk: 0.15,
    clientAvailability: 0.80,
  };
}

function caso3(): ProjectInput {
  return {
    modules: Array.from({ length: 6 }, () => ({
      complexity: 4,
      clarity: 2,
      criticality: 5,
      screensCount: 8,
      reportsCount: 4,
      integrationsCount: 2,
      sensitiveData: true,
    })),
    dataMigration: true,
    externalIntegrationsCount: 4,
    changeProbability: 0.35,
    clientUnavailability: 0.30,
    turnoverRisk: 0.25,
    clientAvailability: 0.45,
  };
}

// ============================================================
// Tests
// ============================================================

describe("clarityFactor / esfuerzo base", () => {
  it("Caso 1: bytecoding suma 1.10 horas-persona, mas que traditional", () => {
    const project = caso1();
    const t = computeEffort(project, "traditional", factors);
    const b = computeEffort(project, "bytecoding_prompts", factors);
    expect(b.totalEffortHours).toBeGreaterThan(t.totalEffortHours);
    expect(b.actualSum).toBeCloseTo(1.10, 4);
    expect(t.actualSum).toBeCloseTo(1.00, 4);
  });

  it("Bytecoding tiene menos coding pero mas review+test+hardening", () => {
    const project = caso1();
    const t = computeEffort(project, "traditional", factors);
    const b = computeEffort(project, "bytecoding_prompts", factors);
    expect(b.phases.coding).toBeLessThan(t.phases.coding);
    expect(b.phases.review + b.phases.testing + b.phases.hardening).toBeGreaterThan(
      t.phases.review + t.phases.testing,
    );
  });

  it("Coeficientes invalidos (suma fuera de tolerancia) lanzan error", () => {
    const broken = JSON.parse(JSON.stringify(factors)) as DevModeFactors;
    broken.traditional.coding = 0.99; // ahora suma 1.54
    expect(() => computeEffort(caso1(), "traditional", broken)).toThrow();
  });
});

describe("Escenarios optimista/probable/conservador", () => {
  it("Caso 1: probable < conservador, conservador no excede 1.80x", () => {
    const project = caso1();
    const e = computeEffort(project, "traditional", factors);
    const s = computeScenarios(e, project, scenarios);
    expect(s.probable.totalEffortHours).toBeLessThan(s.conservative.totalEffortHours);
    expect(s.optimistic.totalEffortHours).toBeLessThan(s.probable.totalEffortHours);
    expect(s.conservative.factor).toBeGreaterThanOrEqual(scenarios.conservative_min);
    expect(s.conservative.factor).toBeLessThanOrEqual(scenarios.conservative_max);
  });

  it("Caso 3: integracion compleja activa todos los aumentos del conservador", () => {
    const project = caso3();
    const e = computeEffort(project, "traditional", factors);
    const s = computeScenarios(e, project, scenarios);
    // claridad <3 + integraciones >2 + sensibles + cambio >0.3 + cliente <0.5 = +0.45 sobre 1.25 = 1.70
    expect(s.conservative.factor).toBeCloseTo(1.70, 2);
  });
});

describe("Tiempo calendario y velocidad de bytecoding", () => {
  it("Bytecoding entrega prototipo MUCHO mas rapido que traditional aun con mas horas-persona", () => {
    const project = caso1();
    const trad = computeEffort(project, "traditional", factors);
    const byte = computeEffort(project, "bytecoding_prompts", factors);
    const calT = computeCalendar(trad, "traditional", velocity, 60);
    const calB = computeCalendar(byte, "bytecoding_prompts", velocity, 60);
    expect(calB.weeksToPrototype).toBeLessThan(calT.weeksToPrototype / 3);
    expect(calB.prototypeQualityPct).toBe(0.55);
  });

  it("Hybrid es intermedio entre traditional y bytecoding en velocidad calendario", () => {
    const project = caso2();
    const trad = computeEffort(project, "traditional", factors);
    const hyb = computeEffort(project, "hybrid", factors);
    const byte = computeEffort(project, "bytecoding_prompts", factors);
    const wT = computeCalendar(trad, "traditional", velocity, 80).weeksTotal;
    const wH = computeCalendar(hyb, "hybrid", velocity, 80).weeksTotal;
    const wB = computeCalendar(byte, "bytecoding_prompts", velocity, 80).weeksTotal;
    expect(wH).toBeLessThan(wT);
    expect(wB).toBeLessThan(wT);
  });
});

describe("Costo fiscal-laboral por perfil", () => {
  it("Modo detallado: incluye todos los ramos IMSS + INFONAVIT + ISN+UAZ", () => {
    const cost = computeProfileCost({ monthlySalary: 30000, riskClass: "I" }, fiscal);
    expect(cost.imssPatronal).toBeGreaterThan(0);
    expect(cost.infonavit).toBeCloseTo((30000 / 30.4) * 0.05 * 30.4, 0);
    expect(cost.isnTotal).toBeCloseTo(30000 * 0.035 * 1.10, 1);  // ISN + 10% UAZ
    expect(cost.imssDetail).toBeDefined();
    expect(cost.imssDetail!.ceav).toBeGreaterThan(0);
  });

  it("Modo factor estimado: total ~ salario * 1.40 + ISN", () => {
    const cost = computeProfileCost(
      { monthlySalary: 30000, useEstimatedFactor: true, estimatedFactor: 0.40 },
      fiscal,
    );
    const expectedSinISN = 30000 * (1 + 0.40);
    const expectedISN = 30000 * 0.035 * 1.10;
    expect(cost.total).toBeCloseTo(expectedSinISN + expectedISN, 0);
    expect(cost.imssPatronal).toBe(0);  // factor estimado no desglosa
  });

  it("CEAV: SBC mayor implica mayor cuota patronal", () => {
    const low = computeProfileCost({ monthlySalary: 6000 }, fiscal);
    const high = computeProfileCost({ monthlySalary: 60000 }, fiscal);
    expect(high.imssDetail!.ceav / high.salary).toBeGreaterThan(
      low.imssDetail!.ceav / low.salary,
    );
  });
});

describe("Precio (subtotal/IVA/total) y ISR", () => {
  it("subtotal = total_cost / (1 - margen)", () => {
    const p = computePricing({ totalCost: 100000, targetMargin: 0.20 }, 0.16);
    expect(p.subtotal).toBeCloseTo(125000, 2);
    expect(p.vat).toBeCloseTo(20000, 2);
    expect(p.total).toBeCloseTo(145000, 2);
    expect(p.marginAmount).toBeCloseTo(25000, 2);
  });

  it("ISR: 30% sobre utilidad fiscal positiva", () => {
    const isr = computeISR(125000, 80000, 5000, 0.30);
    expect(isr).toBeCloseTo(40000 * 0.30, 2);
  });

  it("ISR: 0 cuando utilidad fiscal es negativa", () => {
    const isr = computeISR(50000, 60000, 5000, 0.30);
    expect(isr).toBe(0);
  });
});

describe("Caso 4 - Proveedor sin anticipo: capital de trabajo alto", () => {
  it("Sin anticipo, working_capital_required > 0 y crece con duracion", () => {
    const corto = buildSimpleCashFlow({
      totalContractAmount: 300000,
      anticipoPct: 0,
      finalPaymentPct: 1.0,
      monthlyOutflowPayroll: 80000,
      monthlyOutflowTaxes: 10000,
      monthlyOutflowTools: 3000,
      monthlyOutflowAdmin: 5000,
      durationMonths: 3,
    });
    const largo = buildSimpleCashFlow({
      totalContractAmount: 600000,
      anticipoPct: 0,
      finalPaymentPct: 1.0,
      monthlyOutflowPayroll: 80000,
      monthlyOutflowTaxes: 10000,
      monthlyOutflowTools: 3000,
      monthlyOutflowAdmin: 5000,
      durationMonths: 6,
    });
    expect(corto.workingCapitalRequired).toBeGreaterThan(0);
    expect(largo.workingCapitalRequired).toBeGreaterThan(corto.workingCapitalRequired);
  });

  it("Con 30% anticipo, working_capital_required cae respecto a 0% anticipo", () => {
    const sinAnticipo = buildSimpleCashFlow({
      totalContractAmount: 600000,
      anticipoPct: 0,
      finalPaymentPct: 1.0,
      monthlyOutflowPayroll: 80000,
      monthlyOutflowTaxes: 10000,
      monthlyOutflowTools: 3000,
      monthlyOutflowAdmin: 5000,
      durationMonths: 6,
    });
    const conAnticipo = buildSimpleCashFlow({
      totalContractAmount: 600000,
      anticipoPct: 0.30,
      finalPaymentPct: 0.30,
      monthlyOutflowPayroll: 80000,
      monthlyOutflowTaxes: 10000,
      monthlyOutflowTools: 3000,
      monthlyOutflowAdmin: 5000,
      durationMonths: 6,
    });
    expect(conAnticipo.workingCapitalRequired).toBeLessThan(sinAnticipo.workingCapitalRequired);
  });
});

describe("Riesgo agregado", () => {
  it("Caso 1: riesgo 'bajo' o 'medio'", () => {
    const project = caso1();
    const r = computeRisk(project, {
      workingCapitalRequired: 0,
      capitalDeclaredByProvider: 100000,
      marginPct: 0.20,
      isnUazRate: 0.0385,
      fiscalIvaRate: 0.16,
    });
    expect(["bajo", "medio"]).toContain(r.level);
  });

  it("Caso 3: riesgo 'alto' o 'critico' por integraciones+datos+claridad baja", () => {
    const project = caso3();
    const r = computeRisk(project, {
      workingCapitalRequired: 200000,
      capitalDeclaredByProvider: 50000,
      marginPct: 0.10,
      isnUazRate: 0.0385,
      fiscalIvaRate: 0.16,
    });
    expect(["alto", "critico"]).toContain(r.level);
  });
});

describe("Validacion seed JSON", () => {
  it("Las 5 sumas de modos coinciden con _expected_sums", () => {
    for (const mode of ["traditional", "ai_assisted", "bytecoding_prompts", "low_code", "hybrid"] as DevelopmentMode[]) {
      const f = factors[mode];
      const sum =
        f.coding + f.review + f.testing + f.documentation + f.deployment + (f.management ?? 0) + (f.hardening ?? 0);
      expect(sum).toBeCloseTo(factors._expected_sums[mode], 4);
    }
  });

  it("FiscalRates carga todos los ramos IMSS sin null", () => {
    expect(fiscal.IVA).toBe(0.16);
    expect(fiscal.ISR).toBe(0.30);
    expect(fiscal.ISN).toBe(0.035);
    expect(fiscal.UAZ).toBe(0.10);
    expect(fiscal.UMA_DIARIA).toBe(117.31);
    expect(fiscal.INFONAVIT).toBe(0.05);
    expect(Object.values(fiscal.RIESGO_CLASE).every((v) => v > 0)).toBe(true);
    expect(Object.keys(fiscal.CEAV_PATRON_TABLE).length).toBeGreaterThanOrEqual(8);
  });
});

// ============================================================
// Caso C5 - Bytecoding cotizado vs ejecucion real (addendum 25)
// ============================================================

describe("Caso C5 - Bytecoding cotizado vs real", () => {
  it("low_code suma 1.0 y tiene velocity_factor mas alto que cualquier otro modo", () => {
    const project = caso1();
    const lc = computeEffort(project, "low_code", factors);
    expect(lc.actualSum).toBeCloseTo(1.00, 4);
    expect(lc.totalEffortHours).toBeGreaterThan(0);
    // Verificacion velocity (low_code 1.50 > bytecoding 1.40 > hybrid 1.30 > assisted 1.25 > trad 1.00)
    const velTrad = (seed as unknown as { development_mode_velocity: Record<string, { velocity_factor: number }> }).development_mode_velocity;
    expect(velTrad.low_code.velocity_factor).toBeGreaterThan(velTrad.bytecoding_prompts.velocity_factor);
    expect(velTrad.bytecoding_prompts.velocity_factor).toBeGreaterThan(velTrad.hybrid.velocity_factor);
    expect(velTrad.hybrid.velocity_factor).toBeGreaterThan(velTrad.ai_assisted.velocity_factor);
  });

  it("Bytecoding entrega prototipo en ~28% del tiempo que tradicional, pero costo total similar o mayor", () => {
    const project = caso2();  // proyecto medio
    const trad = computeEffort(project, "traditional", factors);
    const byte = computeEffort(project, "bytecoding_prompts", factors);
    const calT = computeCalendar(trad, "traditional", velocity, 80);
    const calB = computeCalendar(byte, "bytecoding_prompts", velocity, 80);
    // Tiempo a prototipo: bytecoding mucho menor
    expect(calB.weeksToPrototype / calT.weeksToPrototype).toBeLessThan(0.35);
    // Horas-persona: bytecoding >= tradicional (es la senal del modelo)
    expect(byte.totalEffortHours).toBeGreaterThanOrEqual(trad.totalEffortHours);
  });
});

// ============================================================
// Metricas de validacion cientifica (addendum 25)
// ============================================================

describe("Metricas cientificas - cobertura de rango y deteccion de riesgo", () => {
  it("Detecta cobertura de rango cuando real cae dentro de optimista-conservador", async () => {
    const { computeScientificMetrics } = await import("@/lib/engine");
    const m = computeScientificMetrics({
      optimisticHours: 800,
      probableHours: 1000,
      conservativeHours: 1300,
      optimisticCost: 400000,
      probableCost: 500000,
      conservativeCost: 700000,
      actualHours: 1100,
      actualCost: 550000,
      actualChangeCount: 3,
      predictedChangeProbability: 0.30,
      predictedWorkingCapitalRequired: 50000,
      predictedMaintenanceCost: 30000,
      hasParametersSnapshot: true,
      hasPhaseBreakdown: true,
    });
    expect(m.rangeCoverage?.effortInRange).toBe(true);
    expect(m.rangeCoverage?.costInRange).toBe(true);
    expect(m.effortError?.pct).toBeLessThan(0.15);
    expect(m.riskDetected.changes).toBe("anticipated");
    expect(m.explainability.score).toBe(1.0);
  });

  it("Marca cambios como missed cuando el sistema no anticipo cambios pero hubo muchos", async () => {
    const { computeScientificMetrics } = await import("@/lib/engine");
    const m = computeScientificMetrics({
      optimisticHours: 800,
      probableHours: 1000,
      conservativeHours: 1300,
      optimisticCost: 400000,
      probableCost: 500000,
      conservativeCost: 700000,
      actualChangeCount: 5,
      predictedChangeProbability: 0.05,  // prediccion baja
      predictedWorkingCapitalRequired: 0,
      predictedMaintenanceCost: 0,
      hasParametersSnapshot: false,
      hasPhaseBreakdown: false,
    });
    expect(m.riskDetected.changes).toBe("missed");
    expect(m.explainability.score).toBe(0);
  });

  it("Calcula diferencia entre modos: bytecoding mas lento por horas-persona, low_code mas rapido", async () => {
    const { computeScientificMetrics } = await import("@/lib/engine");
    const m = computeScientificMetrics({
      optimisticHours: 800, probableHours: 1000, conservativeHours: 1300,
      optimisticCost: 0, probableCost: 0, conservativeCost: 0,
      predictedChangeProbability: 0,
      predictedWorkingCapitalRequired: 0,
      predictedMaintenanceCost: 0,
      hasParametersSnapshot: true,
      hasPhaseBreakdown: true,
      modeEffortMap: {
        traditional: 1000,
        ai_assisted: 1000,
        bytecoding_prompts: 1100,
        low_code: 800,
        hybrid: 1000,
      },
    });
    expect(m.modeDifference?.fastestMode).toBe("low_code");
    expect(m.modeDifference?.slowestMode).toBe("bytecoding_prompts");
    expect(m.modeDifference?.range).toBe(300);
  });
});

// ============================================================
// Validacion de aliases de modos (addendum D.2)
// ============================================================

describe("Aliases de modos de desarrollo", () => {
  it("normalizeMode acepta codigos antiguos y los mapea a los nuevos", async () => {
    const { normalizeMode } = await import("@/lib/engine");
    expect(normalizeMode("assisted")).toBe("ai_assisted");
    expect(normalizeMode("bytecoding")).toBe("bytecoding_prompts");
    expect(normalizeMode("traditional")).toBe("traditional");
    expect(normalizeMode("hybrid")).toBe("hybrid");
    expect(normalizeMode("low_code")).toBe("low_code");
    expect(normalizeMode("AI_ASSISTED")).toBe("ai_assisted");
  });

  it("normalizeMode lanza error con codigo invalido", async () => {
    const { normalizeMode } = await import("@/lib/engine");
    expect(() => normalizeMode("invalid_mode")).toThrow();
  });
});

describe("Cotizacion de change requests (curva de Boehm / PMBOK 7)", () => {
  it("aplica factor 1.0 en fase inicio", async () => {
    const { computeChangeCost } = await import("@/lib/engine/change-cost");
    const r = computeChangeCost({ hours: 10, hourlyRate: 500, phase: "inicio", contingency: 0, minimum: 0 });
    expect(r.baseCost).toBe(5000);
    expect(r.phaseFactor).toBe(1.0);
    expect(r.suggestedTotal).toBe(5000);
  });

  it("aplica factor 1.5 en fase mitad", async () => {
    const { computeChangeCost } = await import("@/lib/engine/change-cost");
    const r = computeChangeCost({ hours: 10, hourlyRate: 500, phase: "mitad", contingency: 0, minimum: 0 });
    expect(r.adjustedByPhase).toBe(7500);
    expect(r.suggestedTotal).toBe(7500);
  });

  it("aplica factor 2.5 en fase avanzado y suma contingencia 15%", async () => {
    const { computeChangeCost } = await import("@/lib/engine/change-cost");
    const r = computeChangeCost({ hours: 10, hourlyRate: 500, phase: "avanzado", contingency: 0.15, minimum: 0 });
    expect(r.adjustedByPhase).toBe(12500);
    expect(r.contingencyAmount).toBeCloseTo(1875, 2);
    expect(r.suggestedTotal).toBeCloseTo(14375, 2);
  });

  it("respeta el costo minimo cuando el calculo queda muy bajo", async () => {
    const { computeChangeCost } = await import("@/lib/engine/change-cost");
    const r = computeChangeCost({ hours: 1, hourlyRate: 200, phase: "inicio", contingency: 0.15, minimum: 5000 });
    expect(r.suggestedTotal).toBe(5000);
    expect(r.hitMinimum).toBe(true);
  });
});
