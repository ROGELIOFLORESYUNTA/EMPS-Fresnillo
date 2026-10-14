/**
 * El equipo persona por persona: contrato "propio", semanas asignadas que entran
 * al costo, a la liquidación y a la nómina de cada mes, y la carga de nómina que
 * usa la calculadora de cambios.
 */
import { describe, it, expect } from "vitest";
import {
  computeProfileCost,
  computeLFTRisk,
  buildSimpleCashFlow,
  construirExplicacion,
  loadFiscalRatesFromSeed,
  mesesDePersona,
  mesesDeSemanasAsignadas,
  costoMensualDePersona,
  costoMensualDelEquipo,
  costoDelEquipo,
  nominaPorMes,
  cargaNominaDelEquipo,
  SEMANAS_POR_MES,
  CARGA_NOMINA_POR_OMISION,
  type PerfilDeEquipo,
} from "@/lib/engine";
import { computeChangeImpact } from "@/lib/engine/change-impact";
import type { ChangeImpactInput } from "@/lib/engine/change-types";
import seed from "@/17_seed_data_parametros_2026.json";

const fiscal = loadFiscalRatesFromSeed(
  seed as { parameters: { key: string; value: number | null; unit: string; table?: Record<string, number> }[] },
);

const dev: PerfilDeEquipo = { monthlySalary: 30000, contractType: "nomina", availabilityPercent: 100 };
const mensualDev = computeProfileCost({ monthlySalary: 30000, contractType: "nomina" }, fiscal).total;

describe("contrato propio: lo que vale tu tiempo", () => {
  const sueldo = 20000;

  it("cuesta solo lo pactado, sin IMSS, INFONAVIT, prestaciones ni impuesto sobre nómina", () => {
    const c = computeProfileCost({ monthlySalary: sueldo, contractType: "propio" }, fiscal);
    expect(c.total).toBe(sueldo);
    expect(c.imssPatronal).toBe(0);
    expect(c.infonavit).toBe(0);
    expect(c.isnTotal).toBe(0);
    expect(c.benefitsProvision).toBe(0);
  });

  it("tampoco lleva carga en el modo de factor estimado", () => {
    const c = computeProfileCost(
      { monthlySalary: sueldo, contractType: "propio", useEstimatedFactor: true, estimatedFactor: 0.4 },
      fiscal,
    );
    expect(c.total).toBe(sueldo);
  });

  it("sale más barato que el mismo sueldo en nómina o en asimilados", () => {
    const nomina = computeProfileCost({ monthlySalary: sueldo, contractType: "nomina" }, fiscal).total;
    const asimilados = computeProfileCost({ monthlySalary: sueldo, contractType: "asimilados" }, fiscal).total;
    expect(nomina).toBeGreaterThan(sueldo * 1.25);
    expect(asimilados).toBeGreaterThan(sueldo);
    expect(asimilados).toBeLessThan(nomina);
  });

  it("no entra a la liquidación LFT aunque el proyecto dure 9 meses", () => {
    const r = computeLFTRisk({
      team: [{ monthlySalary: 30000, contractType: "propio", availabilityPercent: 100, monthsInProject: 9 }],
      realMonthsOfProject: 9,
      willTerminateAtEnd: true,
    });
    expect(r.isAtRisk).toBe(false);
    expect(r.estimatedTerminationCost).toBe(0);
    expect(r.recommendation).toContain("propio");
  });
});

describe("mesesDePersona: cuántos meses cuenta cada quien", () => {
  it("sin semanas asignadas participa todo el proyecto", () => {
    expect(mesesDePersona({}, 6)).toBe(6);
    expect(mesesDePersona({ weeksAssigned: null }, 6)).toBe(6);
  });

  it("8 semanas en un proyecto de 6 meses son 1.85 meses (8 / 4.33)", () => {
    expect(SEMANAS_POR_MES).toBe(4.33);
    const m = mesesDePersona({ weeksAssigned: 8 }, 6);
    expect(m).toBeCloseTo(1.85, 2);
    expect(m).toBe(8 / 4.33);
  });

  it("nunca pasa de los meses del proyecto", () => {
    expect(mesesDePersona({ weeksAssigned: 40 }, 6)).toBe(6);
  });

  it("semanas en cero o negativas se toman como sin dato, para no borrar su costo", () => {
    expect(mesesDePersona({ weeksAssigned: 0 }, 6)).toBe(6);
    expect(mesesDePersona({ weeksAssigned: -3 }, 6)).toBe(6);
    expect(mesesDePersona({ weeksAssigned: Number.NaN }, 6)).toBe(6);
  });

  it("el mes que se guarda en monthsAssigned va a dos decimales", () => {
    expect(mesesDeSemanasAsignadas(8)).toBe(1.85);
    expect(mesesDeSemanasAsignadas(12)).toBe(2.77);
  });
});

describe("costoDelEquipo: cada persona por los meses que participa", () => {
  const qa: PerfilDeEquipo = { monthlySalary: 24000, contractType: "honorarios", availabilityPercent: 50 };

  it("la disponibilidad escala el costo mensual como siempre (honorarios 24,000 al 50 % = 12,000)", () => {
    expect(costoMensualDePersona(qa, fiscal)).toBe(12000);
    expect(costoMensualDePersona(dev, fiscal)).toBe(mensualDev);
  });

  it("sin semanas asignadas es el mes del equipo por los meses del proyecto, igual que antes", () => {
    const mes = costoMensualDelEquipo([dev, qa], fiscal);
    expect(mes).toBeCloseTo(mensualDev + 12000, 6);
    expect(costoDelEquipo([dev, qa], fiscal, { realMonths: 6 })).toBeCloseTo(mes * 6, 6);
  });

  it("quien participa 8 semanas cuenta 1.85 meses y no los 6 del proyecto", () => {
    const qaParcial = { ...qa, weeksAssigned: 8 };
    const costo = costoDelEquipo([dev, qaParcial], fiscal, { realMonths: 6 });
    expect(costo).toBeCloseTo(mensualDev * 6 + 12000 * (8 / 4.33), 6);
    expect(costo).toBeLessThan(costoDelEquipo([dev, qa], fiscal, { realMonths: 6 }));
  });

  it("cada escenario usa sus propios meses: la persona de 8 semanas cuesta lo mismo en los dos", () => {
    const qaParcial = { ...qa, weeksAssigned: 8 };
    const corto = costoDelEquipo([dev, qaParcial], fiscal, { realMonths: 4 });
    const largo = costoDelEquipo([dev, qaParcial], fiscal, { realMonths: 8 });
    expect(largo - corto).toBeCloseTo(mensualDev * 4, 6);
  });

  it("respeta el modo de factor estimado", () => {
    const estimado = computeProfileCost(
      { monthlySalary: 30000, contractType: "nomina", useEstimatedFactor: true, estimatedFactor: 0.4 },
      fiscal,
    ).total;
    expect(costoDelEquipo([dev], fiscal, { realMonths: 3, useEstimated: true })).toBeCloseTo(estimado * 3, 6);
  });
});

describe("la liquidación LFT se mide por persona", () => {
  const enLft = (equipo: PerfilDeEquipo[], realMonths: number) =>
    computeLFTRisk({
      team: equipo.map((p) => ({
        monthlySalary: p.monthlySalary,
        contractType: p.contractType,
        availabilityPercent: p.availabilityPercent,
        monthsInProject: mesesDePersona(p, realMonths),
      })),
      realMonthsOfProject: realMonths,
      willTerminateAtEnd: true,
    });
  const diario = 30000 / 30;

  it("quien sale a las 8 semanas no genera liquidación aunque el proyecto dure 9 meses", () => {
    const r = enLft([dev, { ...dev, weeksAssigned: 8 }], 9);
    expect(r.isAtRisk).toBe(true);
    expect(r.affectedProfilesCount).toBe(1);
    const anios = 9 / 12;
    expect(r.estimatedTerminationCost).toBeCloseTo(diario * 90 + diario * 20 * anios + diario * 12 * anios, 2);
  });

  it("si nadie en nómina pasa de 6 meses, no hay riesgo aunque el proyecto sí pase", () => {
    const r = enLft([{ ...dev, weeksAssigned: 8 }, { ...dev, contractType: "propio" }], 9);
    expect(r.isAtRisk).toBe(false);
    expect(r.estimatedTerminationCost).toBe(0);
    expect(r.affectedProfilesCount).toBe(0);
    expect(r.recommendation).toContain("Ninguna persona en nómina pasa de 6 meses");
  });

  it("la antigüedad de cada liquidación es la de esa persona (9 meses una, 7 meses la otra)", () => {
    const r = enLft([dev, { ...dev, weeksAssigned: 7 * 4.33 }], 9);
    expect(r.affectedProfilesCount).toBe(2);
    const total = (meses: number) => diario * 90 + diario * 20 * (meses / 12) + diario * 12 * (meses / 12);
    expect(r.perProfileBreakdown[0].total).toBeCloseTo(total(9), 2);
    expect(r.perProfileBreakdown[1].total).toBeCloseTo(total(7), 2);
    expect(r.estimatedTerminationCost).toBeCloseTo(total(9) + total(7), 2);
  });

  it("sin meses por persona todo el proyecto cuenta, como antes", () => {
    const r = computeLFTRisk({
      team: [{ monthlySalary: 30000, contractType: "nomina", availabilityPercent: 100 }],
      realMonthsOfProject: 9,
      willTerminateAtEnd: true,
    });
    expect(r.isAtRisk).toBe(true);
    expect(r.affectedProfilesCount).toBe(1);
  });
});

describe("nominaPorMes: la nómina de cada mes", () => {
  const propioParcial: PerfilDeEquipo = { monthlySalary: 30000, contractType: "propio", availabilityPercent: 100, weeksAssigned: 8 };

  it("quien sale a las 8 semanas paga completo el mes 1, parte del mes 2 y nada del 3 en adelante", () => {
    const m = nominaPorMes([propioParcial], fiscal, { realMonths: 6 });
    expect(m).toHaveLength(6);
    expect(m[0]).toBeCloseTo(30000, 6);
    expect(m[1]).toBeCloseTo(30000 * (8 / 4.33 - 1), 6);
    expect(m.slice(2)).toEqual([0, 0, 0, 0]);
  });

  it("con alguien de tiempo completo, del mes 3 en adelante queda solo lo de esa persona", () => {
    const m = nominaPorMes([propioParcial, dev], fiscal, { realMonths: 6 });
    expect(m[0]).toBeCloseTo(30000 + mensualDev, 6);
    expect(m[2]).toBeCloseTo(mensualDev, 6);
    expect(m[5]).toBeCloseTo(mensualDev, 6);
  });

  it("los meses van enteros hacia arriba y el último se prorratea (6.4 meses son 7 y el séptimo vale 0.4)", () => {
    const m = nominaPorMes([dev], fiscal, { realMonths: 6.4 });
    expect(m).toHaveLength(7);
    expect(m[5]).toBeCloseTo(mensualDev, 6);
    expect(m[6]).toBeCloseTo(mensualDev * 0.4, 6);
  });

  it("la suma de todos los meses es el costo del equipo", () => {
    const equipo: PerfilDeEquipo[] = [
      propioParcial,
      dev,
      { monthlySalary: 24000, contractType: "honorarios", availabilityPercent: 50, weeksAssigned: 20 },
    ];
    for (const realMonths of [0.5, 3, 6.4, 9.75]) {
      const suma = nominaPorMes(equipo, fiscal, { realMonths }).reduce((a, b) => a + b, 0);
      expect(suma).toBeCloseTo(costoDelEquipo(equipo, fiscal, { realMonths }), 6);
    }
  });

  it("un proyecto de medio mes tiene un solo mes, prorrateado", () => {
    const m = nominaPorMes([dev], fiscal, { realMonths: 0.5 });
    expect(m).toHaveLength(1);
    expect(m[0]).toBeCloseTo(mensualDev * 0.5, 6);
  });
});

describe("buildSimpleCashFlow con la nómina mes a mes", () => {
  const base = {
    totalContractAmount: 600000,
    anticipoPct: 0.3,
    finalPaymentPct: 0.3,
    monthlyOutflowTools: 3000,
    monthlyOutflowAdmin: 5000,
    durationMonths: 4,
  };

  it("con un número se comporta igual que con ese mismo número repetido cada mes", () => {
    const fijo = buildSimpleCashFlow({ ...base, monthlyOutflowPayroll: 80000, monthlyOutflowTaxes: 8000 });
    const arreglo = buildSimpleCashFlow({
      ...base,
      monthlyOutflowPayroll: [80000, 80000, 80000, 80000],
      monthlyOutflowTaxes: [8000, 8000, 8000, 8000],
    });
    expect(arreglo).toEqual(fijo);
    expect(fijo.months.map((m) => m.payrollOutflow)).toEqual([80000, 80000, 80000, 80000]);
  });

  it("con un arreglo cada mes lleva su nómina y un mes que falta vale cero", () => {
    const r = buildSimpleCashFlow({ ...base, monthlyOutflowPayroll: [80000, 40000], monthlyOutflowTaxes: [8000, 4000] });
    expect(r.months.map((m) => m.payrollOutflow)).toEqual([80000, 40000, 0, 0]);
    expect(r.months.map((m) => m.taxOutflow)).toEqual([8000, 4000, 0, 0]);
  });

  it("si alguien sale antes, el flujo pide menos capital de trabajo que con la nómina completa todos los meses", () => {
    const equipo = [dev, { ...dev, weeksAssigned: 8 }];
    const nomina = nominaPorMes(equipo, fiscal, { realMonths: 4 });
    const mesCompleto = costoMensualDelEquipo(equipo, fiscal);
    const sinCambio = buildSimpleCashFlow({
      ...base,
      anticipoPct: 0,
      finalPaymentPct: 1,
      monthlyOutflowPayroll: mesCompleto,
      monthlyOutflowTaxes: mesCompleto * 0.1,
    });
    const conSalida = buildSimpleCashFlow({
      ...base,
      anticipoPct: 0,
      finalPaymentPct: 1,
      monthlyOutflowPayroll: nomina,
      monthlyOutflowTaxes: nomina.map((n) => n * 0.1),
    });
    expect(conSalida.workingCapitalRequired).toBeLessThan(sinCambio.workingCapitalRequired);
  });
});

describe("cargaNominaDelEquipo: cuánta carga de nómina lleva un cambio", () => {
  const propio: PerfilDeEquipo = { monthlySalary: 20000, contractType: "propio", availabilityPercent: 100 };

  it("un equipo solo propio no lleva carga de nómina", () => {
    expect(cargaNominaDelEquipo([propio])).toBe(0);
  });

  it("un equipo solo en nómina lleva la de siempre, 0.245", () => {
    expect(CARGA_NOMINA_POR_OMISION).toBe(0.245);
    expect(cargaNominaDelEquipo([dev, { ...dev, monthlySalary: 20000 }])).toBe(0.245);
  });

  it("un equipo mixto lleva la parte de la nómina que de verdad es nómina", () => {
    // 30,000 en nómina de 40,000 en total = 75 %
    const c = cargaNominaDelEquipo([dev, { ...propio, monthlySalary: 10000 }]);
    expect(c).toBeCloseTo(0.245 * 0.75, 10);
  });

  it("pesa por la disponibilidad: el que dedica la mitad pesa la mitad", () => {
    // nómina 30,000 al 100 % = 30,000; propio 30,000 al 50 % = 15,000 -> 30,000 / 45,000
    const c = cargaNominaDelEquipo([dev, { ...propio, monthlySalary: 30000, availabilityPercent: 50 }]);
    expect(c).toBeCloseTo(0.245 * (30000 / 45000), 10);
  });

  it("sin dato de disponibilidad cuenta todo su tiempo", () => {
    const c = cargaNominaDelEquipo([
      { monthlySalary: 30000, contractType: "nomina" },
      { monthlySalary: 10000, contractType: "propio" },
    ]);
    expect(c).toBeCloseTo(0.245 * 0.75, 10);
  });

  it("sin equipo se queda la carga por omisión; con sueldos en cero se reparte por personas", () => {
    expect(cargaNominaDelEquipo([])).toBe(0.245);
    const c = cargaNominaDelEquipo([
      { monthlySalary: 0, contractType: "nomina", availabilityPercent: 100 },
      { monthlySalary: 0, contractType: "propio", availabilityPercent: 100 },
    ]);
    expect(c).toBeCloseTo(0.245 * 0.5, 10);
  });
});

describe("la calculadora de cambios usa la carga de nómina y de administración que se le pase", () => {
  const cambio: ChangeImpactInput = {
    projectId: "p1",
    originalText: "Cambio de prueba",
    currentPhase: "after_baseline",
    clarityLevel: 3,
    urgencyLevel: 3,
    developmentMode: "hybrid",
    affectedArtifacts: {
      uiScreens: 2, apiEndpoints: 0, businessRules: 1, databaseTables: 0, reports: 1, rolesPermissions: 0,
      externalIntegrations: 0, dataMigrationObjects: 0, automatedTests: 0, manualTestScenarios: 0, documentsOrTrainingItems: 0,
    },
    securityImpact: 0,
    dataImpact: 0,
    integrationImpact: 0,
    testingRequired: false,
    clientAvailabilityRisk: 0.15,
  };

  it("sin cargas usa 24.5 % de IMSS y 10 % de administración, como siempre", () => {
    const fb = computeChangeImpact(cambio).financialBreakdown!;
    expect(fb.imssEstimated).toBeCloseTo(fb.laborCost * 0.245, 6);
    expect(fb.adminOverhead).toBeCloseTo(fb.laborCost * 0.1, 6);
  });

  it("un equipo propio pasa carga de nómina 0 y el cambio no lleva IMSS", () => {
    const normal = computeChangeImpact(cambio).financialBreakdown!;
    const cargaPropio = cargaNominaDelEquipo([{ monthlySalary: 20000, contractType: "propio", availabilityPercent: 100 }]);
    const propio = computeChangeImpact({ ...cambio, cargaNomina: cargaPropio }).financialBreakdown!;
    expect(propio.imssEstimated).toBe(0);
    expect(propio.laborCost).toBeCloseTo(normal.laborCost, 6);
    expect(normal.subtotalBeforeVat - propio.subtotalBeforeVat).toBeCloseTo(normal.imssEstimated, 6);
  });

  it("la carga de administración también se puede cambiar", () => {
    const fb = computeChangeImpact({ ...cambio, cargaAdmin: 0.2 }).financialBreakdown!;
    expect(fb.adminOverhead).toBeCloseTo(fb.laborCost * 0.2, 6);
  });

  it("una carga fuera de 0 a 1 se ignora y vale la de siempre", () => {
    const fb = computeChangeImpact({ ...cambio, cargaNomina: 5, cargaAdmin: -1 }).financialBreakdown!;
    expect(fb.imssEstimated).toBeCloseTo(fb.laborCost * 0.245, 6);
    expect(fb.adminOverhead).toBeCloseTo(fb.laborCost * 0.1, 6);
  });
});

describe("la cadena de cálculo dice quién participa menos meses", () => {
  const entrada = {
    puntosBase: 1000, factorClaridad: 1.1, claridadPromedio: 4, factorRiesgo: 1.05,
    riesgo: { cambios: 0.05, clienteAusente: 0, rotacion: 0, sinDatoDeCliente: true },
    esfuerzoTecnico: 1155, repartoFases: 0.995, horasTrasReparto: 1149.225, eficienciaModo: 0.72, nombreModo: "híbrido", horasModo: 831.6,
    factorEscenario: 1, nombreEscenario: "probable", horasEscenario: 831.6,
    capacidadSemanal: 152, capacidadCalculadaDelEquipo: true, velocidadModo: 1.9,
    semanas: 26, meses: 6, costoMensualEquipo: 100000, personas: 4, liquidacionLFT: 0,
    costoTotal: 600000, margen: 0.2, subtotal: 750000, tasaIva: 0.16, iva: 120000, total: 870000,
  };
  const paso = (pasos: ReturnType<typeof construirExplicacion>, clave: string) => pasos.find((p) => p.clave === clave)!;

  it("sin participación parcial no agrega nota y la cuenta sigue siendo un mes por los meses", () => {
    const pasos = construirExplicacion(entrada);
    expect(paso(pasos, "costo_mensual").nota).toBeUndefined();
    expect(paso(pasos, "costo_directo").operacion).toBe("100000 × 6 meses");
  });

  it("con dos personas de 8 y 12 semanas lo dice en el renglón del costo mensual", () => {
    const pasos = construirExplicacion({
      ...entrada,
      participacionParcial: [{ semanas: 8 }, { semanas: 12 }],
      costoEquipoProyecto: 600000,
    });
    expect(paso(pasos, "costo_mensual").nota).toContain("2 persona(s) participan solo parte del proyecto: 8 semanas y 12 semanas");
  });

  it("con una sola persona lo dice en singular, y con tres las une con comas y una y", () => {
    const una = construirExplicacion({ ...entrada, participacionParcial: [{ semanas: 1 }], costoEquipoProyecto: 600000 });
    expect(paso(una, "costo_mensual").nota).toContain("1 persona participa solo parte del proyecto: 1 semana.");
    const tres = construirExplicacion({
      ...entrada,
      participacionParcial: [{ semanas: 8 }, { semanas: 12 }, { semanas: 20 }],
      costoEquipoProyecto: 600000,
    });
    expect(paso(tres, "costo_mensual").nota).toContain("3 persona(s) participan solo parte del proyecto: 8 semanas, 12 semanas y 20 semanas");
  });

  it("el costo del proyecto suma lo de cada persona por sus meses, para que la cuenta se pueda rehacer", () => {
    const pasos = construirExplicacion({
      ...entrada,
      participacionParcial: [{ semanas: 8 }],
      costoEquipoProyecto: 520000,
      costoTotal: 520000,
    });
    expect(paso(pasos, "costo_directo").operacion).toBe("520000 del equipo (cada persona por los meses que participa)");
    const conExtras = construirExplicacion({
      ...entrada,
      participacionParcial: [{ semanas: 8 }],
      costoEquipoProyecto: 520000,
      otrosCostos: { herramientasMensual: 1000, administracionMensual: 500 },
      costoTotal: 529000,
    });
    expect(paso(conExtras, "costo_directo").operacion).toBe(
      "520000 del equipo (cada persona por los meses que participa) + 1500 de herramientas y otros costos al mes × 6 meses",
    );
  });
});
