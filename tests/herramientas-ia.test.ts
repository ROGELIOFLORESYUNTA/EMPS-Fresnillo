/**
 * Herramientas de IA y pericia del equipo (septiembre 2026).
 *
 * Antes el motor acreditaba la velocidad de la IA sin cobrar las herramientas
 * y sin importar si el equipo sabía usarla. Estas pruebas fijan las reglas:
 * un asiento por persona técnica sin prorrateo, pesos sin IVA, la ganancia
 * nominal solo se acredita según la pericia, y con pericia 4 y sin
 * herramientas el resultado es el mismo de antes.
 */
import { describe, it, expect } from "vitest";
import {
  asientosDeHerramienta,
  periciaDelEquipo,
  factorDePericia,
  ajustarPorPericia,
  costoHerramientasPorModo,
  factorAumentoPlanes,
  usdDelNivel,
  HERRAMIENTAS_POR_OMISION,
  PERICIA_POR_OMISION,
  construirExplicacion,
  aptitudDeModos,
  type ModuleInput,
} from "@/lib/engine";
import seed from "@/17_seed_data_parametros_2026.json";

const equipoEjemplo = [
  { role: "lider_tecnico", availabilityPercent: 100, aiSkill: 4 },
  { role: "dev_senior", availabilityPercent: 100, aiSkill: 3 },
  { role: "dev_senior", availabilityPercent: 100, aiSkill: 2 },
  { role: "tester", availabilityPercent: 80, aiSkill: 3 },
  { role: "contador", availabilityPercent: 20, aiSkill: 1 },
];

describe("asientos de herramienta", () => {
  it("un asiento por persona técnica, sin prorratear por disponibilidad", () => {
    expect(asientosDeHerramienta(equipoEjemplo)).toBe(4);
  });
  it("contador, administrativo y soporte no ocupan asiento", () => {
    expect(asientosDeHerramienta([{ role: "contador", availabilityPercent: 100 }, { role: "administrativo", availabilityPercent: 100 }])).toBe(0);
  });
});

describe("costo de herramientas por forma de hacerlo", () => {
  it("bytecoding: asientos × USD × (1 + sobreconsumo) × tipo de cambio, sin IVA", () => {
    const r = costoHerramientasPorModo({ mode: "bytecoding_prompts", asientos: 4, tipoCambio: 16.92 });
    expect(r.usdPorAsiento).toBe(230);
    expect(r.sobreconsumo).toBe(0.3);
    expect(r.mensualMXN).toBeCloseTo(4 * 230 * 1.3 * 16.92, 2);
  });
  it("a mano no cuesta herramientas", () => {
    expect(costoHerramientasPorModo({ mode: "traditional", asientos: 4 }).mensualMXN).toBe(0);
  });
  it("low-code cobra el asiento del constructor y, aparte, la licencia por usuario final", () => {
    const sinDato = costoHerramientasPorModo({ mode: "low_code", asientos: 2, tipoCambio: 17, usuariosFinales: null });
    expect(sinDato.mensualMXN).toBeCloseTo(2 * 40 * 17, 2);
    expect(sinDato.usuariosFinalesSupuestos).toBe(true);
    expect(sinDato.usuariosFinales).toBe(10);
    expect(sinDato.mensualUsuariosFinalesMXN).toBeCloseTo(10 * 20 * 17, 2);
    const conDato = costoHerramientasPorModo({ mode: "low_code", asientos: 2, tipoCambio: 17, usuariosFinales: 40 });
    expect(conDato.usuariosFinalesSupuestos).toBe(false);
    expect(conDato.mensualUsuariosFinalesMXN).toBeCloseTo(40 * 20 * 17, 2);
  });
  it("la tabla del seed es la misma que la de respaldo", () => {
    const tabla = (seed as unknown as { ai_tool_costs: { por_modo: Record<string, { usd_por_persona_mes: number; sobreconsumo: number }> } }).ai_tool_costs;
    for (const modo of Object.keys(HERRAMIENTAS_POR_OMISION.por_modo)) {
      expect(tabla.por_modo[modo].usd_por_persona_mes).toBe(HERRAMIENTAS_POR_OMISION.por_modo[modo].usd_por_persona_mes);
      expect(tabla.por_modo[modo].sobreconsumo).toBe(HERRAMIENTAS_POR_OMISION.por_modo[modo].sobreconsumo);
    }
    const factores = (seed as unknown as { ai_skill_factors: Record<string, number> }).ai_skill_factors;
    for (const nivel of ["1", "2", "3", "4", "5"]) expect(factores[nivel]).toBe(PERICIA_POR_OMISION[nivel]);
  });
});

describe("precios de herramientas consultados el 13 de octubre de 2026", () => {
  const tabla = (seed as unknown as { ai_tool_costs: { _consultado: string; por_modo: Record<string, { usd_por_persona_mes: number; niveles: { basico: number; tipico: number; maximo: number } }> } }).ai_tool_costs;

  it("la tabla trae la fecha de consulta", () => {
    expect(tabla._consultado).toBe("2026-10-13");
  });

  it("los tres niveles de cada forma de hacerlo, en USD por persona al mes", () => {
    const niveles = (m: string) => {
      const n = tabla.por_modo[m].niveles;
      return [n.basico, n.tipico, n.maximo];
    };
    expect(niveles("traditional")).toEqual([0, 0, 0]);
    expect(niveles("ai_assisted")).toEqual([10, 30, 100]);
    expect(niveles("hybrid")).toEqual([40, 110, 200]);
    expect(niveles("bytecoding_prompts")).toEqual([100, 230, 400]);
    expect(niveles("low_code")).toEqual([20, 40, 60]);
  });

  it("el nivel típico es el precio de la canasta típica, en el seed y en el respaldo del motor", () => {
    for (const modo of Object.keys(tabla.por_modo)) {
      expect(tabla.por_modo[modo].niveles.tipico, modo).toBe(tabla.por_modo[modo].usd_por_persona_mes);
      expect(HERRAMIENTAS_POR_OMISION.por_modo[modo].niveles?.tipico, modo).toBe(HERRAMIENTAS_POR_OMISION.por_modo[modo].usd_por_persona_mes);
    }
  });

  it("de básico a máximo nunca baja", () => {
    for (const modo of Object.keys(tabla.por_modo)) {
      const n = tabla.por_modo[modo].niveles;
      expect(n.basico, modo).toBeLessThanOrEqual(n.tipico);
      expect(n.tipico, modo).toBeLessThanOrEqual(n.maximo);
    }
  });

  it("el respaldo del motor trae los mismos niveles que el seed", () => {
    for (const modo of Object.keys(tabla.por_modo)) {
      expect(HERRAMIENTAS_POR_OMISION.por_modo[modo].niveles, modo).toEqual(tabla.por_modo[modo].niveles);
    }
  });
});

describe("pericia del equipo con la IA", () => {
  it("promedio ponderado por disponibilidad, solo entre puestos técnicos", () => {
    const p = periciaDelEquipo(equipoEjemplo);
    // (4×100 + 3×100 + 2×100 + 3×80) / 380 = 3.0; el contador (1) no cuenta
    expect(p.promedio).toBeCloseTo(3.0, 2);
    expect(p.conDato).toBe(true);
  });
  it("sin dato se asume 3 y se dice", () => {
    const p = periciaDelEquipo([{ role: "dev_senior", availabilityPercent: 100 }]);
    expect(p.promedio).toBe(3);
    expect(p.conDato).toBe(false);
  });
  it("el factor interpola entre niveles y se recorta a 1..5", () => {
    expect(factorDePericia(4)).toBe(1);
    expect(factorDePericia(1)).toBe(0.35);
    expect(factorDePericia(2.5)).toBeCloseTo((0.65 + 0.85) / 2, 4);
    expect(factorDePericia(9)).toBe(1.15);
    expect(factorDePericia(0)).toBe(0.35);
  });
});

describe("ajuste de la ganancia por pericia", () => {
  const bytecoding = { velocity_factor: 3.0, prototype_speedup: 7.0, hardening_overhead: 0.2, effort_efficiency: 0.65 };

  it("con pericia 4 el resultado es el nominal", () => {
    const a = ajustarPorPericia(bytecoding, "bytecoding_prompts", 4);
    expect(a.effort_efficiency).toBe(0.65);
    expect(a.velocity_factor).toBe(3.0);
    expect(a.prototype_speedup).toBe(7.0);
    expect(a.factor).toBe(1);
  });
  it("con pericia 1 solo se acredita 35 % de la ganancia", () => {
    const a = ajustarPorPericia(bytecoding, "bytecoding_prompts", 1);
    expect(a.effort_efficiency).toBeCloseTo(1 - 0.35 * 0.35, 4);
    expect(a.velocity_factor).toBeCloseTo(1 + 2 * 0.35, 4);
    expect(a.aplica).toBe(true);
  });
  it("a mano y low-code no cambian con la pericia", () => {
    const manual = ajustarPorPericia({ velocity_factor: 1, prototype_speedup: 1, hardening_overhead: 0, effort_efficiency: 1 }, "traditional", 1);
    expect(manual.velocity_factor).toBe(1);
    expect(manual.aplica).toBe(false);
    const lc = ajustarPorPericia({ velocity_factor: 3.5, prototype_speedup: 8, hardening_overhead: 0.25, effort_efficiency: 0.5 }, "low_code", 1);
    expect(lc.velocity_factor).toBe(3.5);
    expect(lc.effort_efficiency).toBe(0.5);
  });
  it("nunca agrega horas por arriba de hacerlo a mano", () => {
    const a = ajustarPorPericia(bytecoding, "bytecoding_prompts", 1, { "1": 0, "2": 0, "3": 0, "4": 1, "5": 1 });
    expect(a.effort_efficiency).toBe(1);
    expect(a.velocity_factor).toBe(1);
  });
});

describe("aptitud con pericia", () => {
  const modulo = (o: Partial<ModuleInput>): ModuleInput => ({
    complexity: 3, clarity: 4, criticality: 3, screensCount: 4, reportsCount: 1, catalogsCount: 0, integrationsCount: 0, sensitiveData: false, ...o,
  });
  const claro = [modulo({}), modulo({ clarity: 5 })];

  it("un equipo que nunca ha usado IA no debe cotizar casi todo con IA", () => {
    const a = aptitudDeModos(claro, undefined, { periciaIA: 1.5 });
    expect(a.bytecoding_prompts.veredicto).toBe("no_recomendable");
    expect(a.bytecoding_prompts.razones.join(" ")).toMatch(/sale más lento/);
    expect(a.ai_assisted.veredicto).toBe("con_reservas");
    expect(a.hybrid.veredicto).toBe("con_reservas");
    expect(a.traditional.veredicto).toBe("apto");
    expect(a.low_code.veredicto).toBe("apto");
  });
  it("con pericia 2.5 bytecoding va con reservas; con 4 queda apto", () => {
    expect(aptitudDeModos(claro, undefined, { periciaIA: 2.5 }).bytecoding_prompts.veredicto).toBe("con_reservas");
    expect(aptitudDeModos(claro, undefined, { periciaIA: 4 }).bytecoding_prompts.veredicto).toBe("apto");
  });
  it("sin dato de pericia no cambia nada", () => {
    expect(aptitudDeModos(claro).bytecoding_prompts.veredicto).toBe("apto");
  });
});

describe("la cadena de cálculo con herramientas y pericia sigue cuadrando", () => {
  it("costo del proyecto = (equipo + herramientas de IA + otros) × meses, y total = subtotal + IVA", () => {
    const pasos = construirExplicacion({
      puntosBase: 1000, factorClaridad: 1.1, claridadPromedio: 4, factorRiesgo: 1.05,
      riesgo: { cambios: 0.05, clienteAusente: 0, rotacion: 0, sinDatoDeCliente: true },
      esfuerzoTecnico: 1155, repartoFases: 1.1, horasTrasReparto: 1270.5,
      eficienciaModo: 0.7025, nombreModo: "casi todo con IA", horasModo: 892.53,
      factorEscenario: 1, nombreEscenario: "probable", horasEscenario: 892.53,
      capacidadSemanal: 152, capacidadCalculadaDelEquipo: true, velocidadModo: 2.7,
      semanas: 2.17, meses: 0.5, costoMensualEquipo: 100000, personas: 4, liquidacionLFT: 0,
      pericia: { promedio: 3.05, conDato: true, factor: 0.85, aplica: true, eficienciaNominal: 0.65, velocidadNominal: 3.0 },
      herramientas: { asientos: 4, usdPorAsiento: 250, sobreconsumo: 0.3, tipoCambio: 16.92, mensualMXN: 21996, descripcion: "Claude Max 20x" },
      otrosCostos: { herramientasMensual: 3000, administracionMensual: 5000 },
      costoTotal: 64998, margen: 0.2, subtotal: 81247.5, tasaIva: 0.16, iva: 12999.6, total: 94247.1,
    });
    const v = (k: string) => pasos.find((p) => p.clave === k)!.valor;
    const paso = (k: string) => pasos.find((p) => p.clave === k)!;
    expect(v("herramientas")).toBeCloseTo(4 * 250 * 1.3 * 16.92, 0);
    expect(v("otros_costos")).toBe(8000);
    expect(v("costo_directo")).toBeCloseTo((v("costo_mensual") + v("herramientas") + v("otros_costos")) * v("meses"), 0);
    expect(v("total")).toBeCloseTo(v("subtotal") + v("iva"), 2);
    expect(paso("modo").operacion).toMatch(/pericia 3.05 de 5/);
    expect(paso("herramientas").nota).toMatch(/Sin IVA/);
    expect(paso("semanas").operacion).toMatch(/nominal 3/);
  });

  it("a mano y sin costos fijos no aparecen los pasos nuevos", () => {
    const pasos = construirExplicacion({
      puntosBase: 100, factorClaridad: 1, claridadPromedio: 4, factorRiesgo: 1,
      riesgo: { cambios: 0, clienteAusente: 0, rotacion: 0, sinDatoDeCliente: false },
      esfuerzoTecnico: 100, repartoFases: 1, horasTrasReparto: 100, eficienciaModo: 1, nombreModo: "programado a mano", horasModo: 100,
      factorEscenario: 1, nombreEscenario: "probable", horasEscenario: 100,
      capacidadSemanal: 40, capacidadCalculadaDelEquipo: true, velocidadModo: 1, semanas: 2.5, meses: 0.58,
      costoMensualEquipo: 50000, personas: 1, liquidacionLFT: 0,
      pericia: { promedio: 3, conDato: false, factor: 1, aplica: false, eficienciaNominal: 1, velocidadNominal: 1 },
      herramientas: { asientos: 1, usdPorAsiento: 0, sobreconsumo: 0, tipoCambio: 16.92, mensualMXN: 0, descripcion: "" },
      otrosCostos: { herramientasMensual: 0, administracionMensual: 0 },
      costoTotal: 29000, margen: 0.2, subtotal: 36250, tasaIva: 0.16, iva: 5800, total: 42050,
    });
    expect(pasos.find((p) => p.clave === "herramientas")).toBeUndefined();
    expect(pasos.find((p) => p.clave === "otros_costos")).toBeUndefined();
  });
});

describe("niveles, plan propio y aumento de precios (la vida real)", () => {
  const equipo = [
    { role: "lider_tecnico", availabilityPercent: 100, aiSkill: 4 },
    { role: "dev_senior", availabilityPercent: 100, aiSkill: 3, aiToolUsdMonthly: 400 },
    { role: "dev_junior", availabilityPercent: 50, aiSkill: 2, aiToolUsdMonthly: 0 },
    { role: "contador", availabilityPercent: 20 },
  ];

  it("el nivel cambia el USD por asiento: básico, típico y máximo", () => {
    const fila = HERRAMIENTAS_POR_OMISION.por_modo.bytecoding_prompts;
    expect(usdDelNivel(fila, "basico")).toBe(100);
    expect(usdDelNivel(fila, "tipico")).toBe(230);
    expect(usdDelNivel(fila, "maximo")).toBe(400);
    const max = costoHerramientasPorModo({ mode: "bytecoding_prompts", asientos: 4, nivel: "maximo", tipoCambio: 16.92 });
    expect(max.mensualMXN).toBeCloseTo(4 * 400 * 1.3 * 16.92, 2);
    expect(max.nivel).toBe("maximo");
  });

  it("con el equipo, quien trae plan propio cobra lo suyo y los demás el nivel", () => {
    const r = costoHerramientasPorModo({ mode: "bytecoding_prompts", team: equipo, nivel: "tipico", tipoCambio: 16.92 });
    expect(r.asientos).toBe(3);
    expect(r.asientosAlNivel).toBe(1);
    expect(r.asientosConPlanPropio).toBe(2);
    expect(r.usdPlanesPropios).toBe(400);
    // (1 × 230 + 400 + 0) × 1.3 × 16.92
    expect(r.mensualMXN).toBeCloseTo((230 + 400) * 1.3 * 16.92, 2);
  });

  it("a mano nadie cobra herramientas, aunque traiga plan propio", () => {
    const r = costoHerramientasPorModo({ mode: "traditional", team: equipo, tipoCambio: 16.92 });
    expect(r.mensualMXN).toBe(0);
    expect(r.asientosConPlanPropio).toBe(0);
  });

  it("sin nivel ni planes propios, el resultado es el mismo que con asientos sueltos (regresión)", () => {
    const sinDatos = equipo.map((p) => ({ role: p.role, availabilityPercent: p.availabilityPercent }));
    const a = costoHerramientasPorModo({ mode: "hybrid", team: sinDatos, tipoCambio: 16.92 });
    const b = costoHerramientasPorModo({ mode: "hybrid", asientos: 3, tipoCambio: 16.92 });
    expect(a.mensualMXN).toBe(b.mensualMXN);
    expect(a.nivel).toBe("tipico");
  });

  it("el aumento anual se prorratea a los meses y nunca baja de 1", () => {
    expect(factorAumentoPlanes(0.15, 12)).toBeCloseTo(1.15, 4);
    expect(factorAumentoPlanes(0.15, 2.9)).toBeCloseTo(1 + 0.15 * 2.9 / 12, 4);
    expect(factorAumentoPlanes(0, 6)).toBe(1);
    expect(factorAumentoPlanes(-1, 6)).toBe(1);
  });

  it("la cadena muestra el nivel, el plan propio y el aumento del escenario conservador", () => {
    const pasos = construirExplicacion({
      puntosBase: 100, factorClaridad: 1, claridadPromedio: 4, factorRiesgo: 1,
      riesgo: { cambios: 0, clienteAusente: 0, rotacion: 0, sinDatoDeCliente: false },
      esfuerzoTecnico: 100, repartoFases: 1.1, horasTrasReparto: 110, eficienciaModo: 0.65, nombreModo: "casi todo con IA", horasModo: 71.5,
      factorEscenario: 1.3, nombreEscenario: "si hay tropiezos", horasEscenario: 92.95,
      capacidadSemanal: 100, capacidadCalculadaDelEquipo: true, velocidadModo: 3, semanas: 0.31, meses: 0.5,
      costoMensualEquipo: 100000, personas: 3, liquidacionLFT: 0,
      pericia: { promedio: 4, conDato: true, factor: 1, aplica: true, eficienciaNominal: 0.65, velocidadNominal: 3 },
      herramientas: { asientos: 3, usdPorAsiento: 250, sobreconsumo: 0.3, tipoCambio: 16.92, mensualMXN: 14297.4, descripcion: "", nivel: "tipico", asientosAlNivel: 1, asientosConPlanPropio: 2, usdPlanesPropios: 400, factorAumento: 1.00625, aumentoAnual: 0.15 },
      otrosCostos: { herramientasMensual: 0, administracionMensual: 0 },
      costoTotal: 57193.2, margen: 0.2, subtotal: 71491.5, tasaIva: 0.16, iva: 11438.64, total: 82930.14,
    });
    const h = pasos.find((p) => p.clave === "herramientas")!;
    expect(h.valor).toBeCloseTo(14297.4 * 1.00625, 1);
    expect(h.operacion).toMatch(/1 asiento\(s\) al nivel tipico × 250 USD/);
    expect(h.operacion).toMatch(/2 con plan propio/);
    expect(h.operacion).toMatch(/15% más caros al año/);
    expect(h.nota).toMatch(/por persona, no por equipo/);
    const v = (k: string) => pasos.find((p) => p.clave === k)!.valor;
    expect(v("costo_directo")).toBeCloseTo((v("costo_mensual") + h.valor) * v("meses"), 0);
  });
});
