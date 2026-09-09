/**
 * Correcciones de cuentas (septiembre 2026), con el antes y el después.
 *
 * Salieron de rehacer a mano el proyecto de ejemplo: la aritmética cuadraba con
 * el código, pero el modelo cobraba cosas dos veces y presentaba constantes
 * como si vinieran del proyecto. Cada prueba deja escrito qué se corrigió y
 * cuánto cambiaba, para que la tesis pueda decirlo con cifras.
 */
import { describe, it, expect } from "vitest";
import {
  computeBasePoints,
  riskFactor,
  computeProfileCost,
  computeLFTRisk,
  loadFiscalRatesFromSeed,
  construirExplicacion,
  type ProjectInput,
} from "@/lib/engine";
import { riesgoDelProyecto, capacidadDelEquipo } from "@/lib/estimate-service";
import seed from "@/17_seed_data_parametros_2026.json";

const fiscal = loadFiscalRatesFromSeed(
  seed as { parameters: { key: string; value: number | null; unit: string; table?: Record<string, number> }[] },
);

function proyecto(extra: Partial<ProjectInput> = {}): ProjectInput {
  return {
    modules: [
      { complexity: 4, clarity: 3, criticality: 5, screensCount: 8, reportsCount: 3, catalogsCount: 2, integrationsCount: 1, sensitiveData: true },
      { complexity: 3, clarity: 4, criticality: 4, screensCount: 6, reportsCount: 2, catalogsCount: 0, integrationsCount: 0, sensitiveData: true },
      { complexity: 4, clarity: 3, criticality: 5, screensCount: 12, reportsCount: 0, catalogsCount: 0, integrationsCount: 2, sensitiveData: true },
    ],
    dataMigration: false,
    externalIntegrationsCount: 3,
    changeProbability: 0,
    clientUnavailability: 0,
    turnoverRisk: 0,
    clientAvailability: 1,
    ...extra,
  };
}

describe("(a) las integraciones se cobran una sola vez", () => {
  it("el conteo de integraciones externas ya no suma horas por segunda vez", () => {
    const con = computeBasePoints(proyecto({ externalIntegrationsCount: 3 }));
    const sin = computeBasePoints(proyecto({ externalIntegrationsCount: 0 }));
    // Antes: 3 integraciones × 80 = 240 horas extra sobre las 50 por módulo ya cobradas.
    expect(con).toBe(sin);
  });

  it("cada integración vale 50 horas dentro de su módulo, no 130", () => {
    const base = proyecto();
    const unaMas = proyecto();
    unaMas.modules[1] = { ...unaMas.modules[1], integrationsCount: 1 };
    unaMas.externalIntegrationsCount = 4;
    expect(computeBasePoints(unaMas) - computeBasePoints(base)).toBe(50);
  });
});

describe("(b) el factor de riesgo sale del proyecto, no de una constante", () => {
  it("sin cambios, cliente disponible y equipo estable, el factor es 1.0", () => {
    const r = riesgoDelProyecto({
      cambiosRegistrados: 0,
      claridadPromedio: 4,
      nivelDisponibilidadCliente: "alta",
      rotacionEquipo: [1, 1],
    });
    expect(r.changeProbability).toBe(0);
    expect(r.clientUnavailability).toBe(0);
    expect(r.turnoverRisk).toBe(0);
    expect(riskFactor(proyecto(r))).toBe(1);
  });

  it("con los datos del proyecto de ejemplo da 1.14, no 1.45", () => {
    // 1 cambio registrado, claridad 3.625, sin dato del cliente, rotación 2,2,3,2
    const r = riesgoDelProyecto({
      cambiosRegistrados: 1,
      claridadPromedio: 3.625,
      nivelDisponibilidadCliente: null,
      rotacionEquipo: [2, 2, 3, 2],
    });
    expect(r.changeProbability).toBeCloseTo(0.05, 6);
    expect(r.clientUnavailability).toBe(0);
    expect(r.sinDatoDeCliente).toBe(true);
    expect(r.turnoverRisk).toBeCloseTo(0.09375, 6);
    expect(riskFactor(proyecto(r))).toBeCloseTo(1.14375, 6);
  });

  it("cada dato mueve su parte y nada más", () => {
    const base = { cambiosRegistrados: 0, claridadPromedio: 4, nivelDisponibilidadCliente: "alta", rotacionEquipo: [1] };
    expect(riesgoDelProyecto({ ...base, cambiosRegistrados: 3 }).changeProbability).toBeCloseTo(0.15, 6);
    expect(riesgoDelProyecto({ ...base, claridadPromedio: 2 }).changeProbability).toBeCloseTo(0.10, 6);
    expect(riesgoDelProyecto({ ...base, nivelDisponibilidadCliente: "baja" }).clientUnavailability).toBe(0.25);
    expect(riesgoDelProyecto({ ...base, rotacionEquipo: [5] }).turnoverRisk).toBeCloseTo(0.30, 6);
  });

  it("los topes impiden que el factor se dispare", () => {
    const r = riesgoDelProyecto({ cambiosRegistrados: 40, claridadPromedio: 1, nivelDisponibilidadCliente: "baja", rotacionEquipo: [5, 5] });
    expect(r.changeProbability).toBeLessThanOrEqual(0.40);
    expect(riskFactor(proyecto(r))).toBeLessThanOrEqual(2.0);
  });
});

describe("(g) la capacidad semanal sale del equipo", () => {
  it("cuatro personas con 100, 100, 100 y 80 por ciento son 152 horas a la semana", () => {
    expect(capacidadDelEquipo([
      { availabilityPercent: 100 }, { availabilityPercent: 100 }, { availabilityPercent: 100 }, { availabilityPercent: 80 },
    ])).toBe(152);
  });

  it("acepta los porcentajes como texto (así vienen de la base)", () => {
    expect(capacidadDelEquipo([{ availabilityPercent: "50" }])).toBe(20);
  });

  it("nunca es cero, para no dividir entre nada", () => {
    expect(capacidadDelEquipo([{ availabilityPercent: 0 }])).toBe(1);
  });
});

describe("(i) el tipo de contrato sí cambia las cargas", () => {
  const sueldo = 30000;

  it("nómina carga IMSS, INFONAVIT y prestaciones", () => {
    const c = computeProfileCost({ monthlySalary: sueldo, contractType: "nomina" }, fiscal);
    expect(c.imssPatronal).toBeGreaterThan(0);
    expect(c.infonavit).toBeGreaterThan(0);
    expect(c.benefitsProvision).toBeGreaterThan(0);
    expect(c.total).toBeGreaterThan(sueldo * 1.25);
  });

  it("honorarios, RESICO y freelance solo cuestan lo pactado", () => {
    for (const tipo of ["honorarios", "resico_pf", "freelance"]) {
      const c = computeProfileCost({ monthlySalary: sueldo, contractType: tipo }, fiscal);
      expect(c.total).toBe(sueldo);
      expect(c.imssPatronal).toBe(0);
      expect(c.infonavit).toBe(0);
      expect(c.isnTotal).toBe(0);
    }
  });

  it("asimilados no paga IMSS pero sí impuesto sobre nómina", () => {
    const c = computeProfileCost({ monthlySalary: sueldo, contractType: "asimilados" }, fiscal);
    expect(c.imssPatronal).toBe(0);
    expect(c.isnTotal).toBeCloseTo(sueldo * 0.035 * 1.10, 2);
    expect(c.total).toBeCloseTo(sueldo + sueldo * 0.035 * 1.10, 2);
  });

  it("sin tipo de contrato se asume nómina (compatibilidad)", () => {
    const con = computeProfileCost({ monthlySalary: sueldo, contractType: "nomina" }, fiscal);
    const sin = computeProfileCost({ monthlySalary: sueldo }, fiscal);
    expect(sin.total).toBe(con.total);
  });
});

describe("(h) la liquidación no vuelve a cobrar lo ya provisionado", () => {
  it("aguinaldo y vacaciones proporcionales van en cero; queda solo lo que la ley obliga al despedir", () => {
    const r = computeLFTRisk({
      team: [{ monthlySalary: 30000, contractType: "nomina", availabilityPercent: 100 }],
      realMonthsOfProject: 9,
      willTerminateAtEnd: true,
    });
    expect(r.isAtRisk).toBe(true);
    const p = r.perProfileBreakdown[0];
    expect(p.aguinaldoProporcional).toBe(0);
    expect(p.vacacionesProporcionales).toBe(0);
    const diario = 30000 / 30;
    const anios = 9 / 12;
    expect(p.total).toBeCloseTo(diario * 90 + diario * 20 * anios + diario * 12 * anios, 2);
    expect(r.estimatedTerminationCost).toBeCloseTo(p.total, 2);
  });
});

describe("la cadena de cálculo cuadra consigo misma", () => {
  it("cada renglón lleva al siguiente y el total es subtotal más IVA", () => {
    const pasos = construirExplicacion({
      puntosBase: 1000, factorClaridad: 1.1, claridadPromedio: 4, factorRiesgo: 1.05,
      riesgo: { cambios: 0.05, clienteAusente: 0, rotacion: 0, sinDatoDeCliente: true },
      esfuerzoTecnico: 1155, repartoFases: 0.995, horasTrasReparto: 1149.225, eficienciaModo: 0.72, nombreModo: "híbrido", horasModo: 831.6,
      factorEscenario: 1, nombreEscenario: "probable", horasEscenario: 831.6,
      capacidadSemanal: 152, capacidadCalculadaDelEquipo: true, velocidadModo: 1.9,
      semanas: 2.879, meses: 0.665, costoMensualEquipo: 100000, personas: 4, liquidacionLFT: 0,
      costoTotal: 66500, margen: 0.2, subtotal: 83125, tasaIva: 0.16, iva: 13300, total: 96425,
    });
    const v = (k: string) => pasos.find((p) => p.clave === k)!.valor;
    expect(v("esfuerzo_tecnico")).toBeCloseTo(v("puntos_base") * v("claridad") * v("riesgo"), 1);
    expect(v("reparto_fases")).toBeCloseTo(1155 * 0.995, 1);
    expect(v("total")).toBeCloseTo(v("subtotal") + v("iva"), 2);
    expect(pasos.find((p) => p.clave === "riesgo")!.nota).toContain("No se capturó");
    expect(pasos.find((p) => p.clave === "semanas")!.nota).toContain("salen del equipo");
  });
});
