/**
 * Tests para las funciones puras de insights de reportes (FASE G.H).
 */
import { describe, it, expect } from "vitest";
import {
  computeProviderOpportunityCost,
  computeProviderViabilityRatio,
  computeMunicipalQuebrarRisk,
  computeOnTimeRisk,
  computeMaintenanceMonthly,
  computeChangeRangeByType,
} from "@/lib/engine/reports-insights";

describe("computeProviderOpportunityCost", () => {
  it("clasifica 'ganas_claro' cuando margen mensual supera 1.3× sueldo mercado", () => {
    const r = computeProviderOpportunityCost(400_000, 50_000, 6);
    // marginMonthly = 66_666; ratio = 1.33
    expect(r.level).toBe("ganas_claro");
    expect(r.ratio).toBeCloseTo(66666.67 / 50000, 2);
    expect(r.deficit).toBeLessThan(0); // ganando, no perdiendo
  });

  it("clasifica 'empate' cuando margen mensual ≈ sueldo mercado", () => {
    const r = computeProviderOpportunityCost(300_000, 50_000, 6);
    expect(r.level).toBe("empate");
  });

  it("clasifica 'perdiendo_poco' cuando margen es 70-100% del mercado", () => {
    const r = computeProviderOpportunityCost(240_000, 50_000, 6);
    // marginMonthly = 40_000; ratio = 0.8
    expect(r.level).toBe("perdiendo_poco");
  });

  it("clasifica 'perdiendo_mucho' cuando margen < 70% del mercado", () => {
    const r = computeProviderOpportunityCost(120_000, 50_000, 6);
    // marginMonthly = 20_000; ratio = 0.4
    expect(r.level).toBe("perdiendo_mucho");
    expect(r.deficit).toBeGreaterThan(0);
  });

  it("levanta warning si monthsAssigned <= 0 pero no rompe", () => {
    const r = computeProviderOpportunityCost(50_000, 50_000, 0);
    expect(r.warningNoMonthsAssigned).toBe(true);
    expect(Number.isFinite(r.marginMonthly)).toBe(true);
  });
});

describe("computeProviderViabilityRatio", () => {
  it("'comodo' cuando bache es <50% del margen", () => {
    const r = computeProviderViabilityRatio(30_000, 100_000);
    expect(r.level).toBe("comodo");
    expect(r.ratio).toBe(0.3);
  });

  it("'apretado' cuando bache es 50-100% del margen", () => {
    const r = computeProviderViabilityRatio(80_000, 100_000);
    expect(r.level).toBe("apretado");
  });

  it("'rojo' cuando bache excede el margen", () => {
    const r = computeProviderViabilityRatio(150_000, 100_000);
    expect(r.level).toBe("rojo");
  });

  it("'rojo' con ratio infinito cuando margen ≤ 0", () => {
    const r = computeProviderViabilityRatio(50_000, 0);
    expect(r.level).toBe("rojo");
    expect(r.ratio).toBe(Infinity);
  });
});

describe("computeMunicipalQuebrarRisk", () => {
  it("'bajo' cuando el bache es <15% del precio", () => {
    const r = computeMunicipalQuebrarRisk(100_000, 1_000_000);
    expect(r.level).toBe("bajo");
  });

  it("'medio' cuando el bache es 15-30% del precio", () => {
    const r = computeMunicipalQuebrarRisk(200_000, 1_000_000);
    expect(r.level).toBe("medio");
  });

  it("'alto' cuando el bache excede 30% del precio", () => {
    const r = computeMunicipalQuebrarRisk(400_000, 1_000_000);
    expect(r.level).toBe("alto");
  });

  it("'alto' cuando totalPrice es 0 (edge case)", () => {
    const r = computeMunicipalQuebrarRisk(50_000, 0);
    expect(r.level).toBe("alto");
  });
});

describe("computeOnTimeRisk", () => {
  const reference = new Date("2026-01-01T00:00:00.000Z");

  it("'sin_fecha' cuando targetDate es null", () => {
    const r = computeOnTimeRisk(10, null, reference);
    expect(r.level).toBe("sin_fecha");
    expect(r.weeksAvailable).toBeNull();
    expect(r.ratio).toBeNull();
  });

  it("'holgado' cuando se necesita menos del 70% del tiempo disponible", () => {
    // 10 semanas necesitan, 20 disponibles → ratio 0.5
    const target = new Date(reference.getTime() + 20 * 7 * 86_400_000);
    const r = computeOnTimeRisk(10, target, reference);
    expect(r.level).toBe("holgado");
  });

  it("'apretado' cuando se necesita 70-90% del tiempo", () => {
    const target = new Date(reference.getTime() + 12 * 7 * 86_400_000);
    const r = computeOnTimeRisk(10, target, reference);
    expect(r.level).toBe("apretado");
  });

  it("'alto_riesgo' cuando se necesita más del 90%", () => {
    const target = new Date(reference.getTime() + 10 * 7 * 86_400_000);
    const r = computeOnTimeRisk(15, target, reference);
    expect(r.level).toBe("alto_riesgo");
    expect(r.daysOverDeadline).toBeGreaterThan(0);
  });

  it("calcula estimatedEndDate correctamente", () => {
    const r = computeOnTimeRisk(4, null, reference);
    expect(r.estimatedEndDate.getTime()).toBe(reference.getTime() + 4 * 7 * 86_400_000);
  });
});

describe("computeMaintenanceMonthly", () => {
  it("calcula 2% mensual por default", () => {
    const r = computeMaintenanceMonthly(1_000_000);
    expect(r.monthlyAmount).toBe(20_000);
    expect(r.annualAmount).toBe(240_000);
    expect(r.pctOfTotal).toBe(0.02);
  });

  it("acepta ratePct custom", () => {
    const r = computeMaintenanceMonthly(1_000_000, 0.015);
    expect(r.monthlyAmount).toBe(15_000);
  });

  it("0 cuando totalPrice ≤ 0", () => {
    const r = computeMaintenanceMonthly(0);
    expect(r.monthlyAmount).toBe(0);
  });
});

describe("computeChangeRangeByType", () => {
  it("devuelve 6 filas, una por cada ChangeType", () => {
    const rows = computeChangeRangeByType(40_000); // $40k/semana
    expect(rows).toHaveLength(6);
    const types = rows.map((r) => r.type);
    expect(types).toEqual([
      "correccion",
      "garantia",
      "ajuste_menor",
      "mejora",
      "nuevo_alcance",
      "cambio_estructural",
    ]);
  });

  it("respeta el orden de magnitud: cambio_estructural es el más caro", () => {
    const rows = computeChangeRangeByType(40_000);
    const correccion = rows.find((r) => r.type === "correccion")!;
    const estructural = rows.find((r) => r.type === "cambio_estructural")!;
    expect(estructural.minCost).toBeGreaterThan(correccion.maxCost * 10);
  });

  it("minCost siempre ≤ maxCost en cada fila", () => {
    const rows = computeChangeRangeByType(40_000);
    rows.forEach((r) => expect(r.minCost).toBeLessThanOrEqual(r.maxCost));
  });

  it("etiqueta y description son strings no vacíos", () => {
    const rows = computeChangeRangeByType(40_000);
    rows.forEach((r) => {
      expect(r.etiqueta.length).toBeGreaterThan(0);
      expect(r.description.length).toBeGreaterThan(0);
    });
  });
});
