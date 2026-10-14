import { describe, it, expect } from "vitest";
import {
  composicionDelPrecio,
  filasDeFormas,
  fraseDelBache,
  escalaDe,
  mesesEnTexto,
  modeloDeFlujo,
  pesos,
  pesosCompactos,
  razonCorta,
  titularDeFormas,
  type EntradaDeEstimacion,
} from "@/lib/graficas";
import { FORMAS_DE_HACERLO, nombreDeForma } from "@/lib/formas";

const cadena = (herramientas: number, otros: number) =>
  JSON.stringify([
    ...(herramientas > 0 ? [{ clave: "herramientas", valor: herramientas }] : []),
    ...(otros > 0 ? [{ clave: "otros_costos", valor: otros }] : []),
    { clave: "costo_directo", valor: 94244 },
  ]);

// Una estimación como la del ejemplo del desarrollador (casi todo con IA, probable).
const ESTIMACION = {
  directCost: 94244,
  indirectCost: 22011,
  subtotal: 117805,
  vat: 18848.8,
  total: 136653.8,
  margin: 0.2,
  explanationJson: cadena(5000, 2500),
};

describe("formato", () => {
  it("pesos sin centavos y con signo menos de verdad", () => {
    expect(pesos(136653.78)).toBe("$136,654");
    expect(pesos(-19699.15)).toBe("−$19,699");
    expect(pesos(0)).toBe("$0");
  });

  it("pesos compactos para los ejes", () => {
    expect(pesosCompactos(0)).toBe("$0");
    expect(pesosCompactos(300000)).toBe("$300 mil");
    expect(pesosCompactos(-50000)).toBe("−$50 mil");
    expect(pesosCompactos(1200000)).toBe("$1.2 M");
    expect(pesosCompactos(2000000)).toBe("$2 M");
    expect(pesosCompactos(850)).toBe("$850");
  });

  it("meses en texto", () => {
    expect(mesesEnTexto(2.76)).toBe("2.8 meses");
    expect(mesesEnTexto(1.02)).toBe("1 mes");
  });

  it("el eje tiene números redondos, trae el cero y no deja demasiado aire", () => {
    const e = escalaDe(0, 620701);
    expect(e.marcas).toEqual([0, 200000, 400000, 600000]);
    expect(e.desde).toBe(0);
    expect(e.hasta).toBe(700000);
    const con = escalaDe(-24500, 96000);
    expect(con.marcas).toContain(0);
    expect(con.marcas.length).toBeGreaterThanOrEqual(3);
    expect(con.desde).toBeLessThanOrEqual(-24500);
    expect(con.hasta).toBeGreaterThanOrEqual(96000);
    // todas las marcas son múltiplos del paso
    expect(con.marcas.every((v) => Math.abs(v / con.paso - Math.round(v / con.paso)) < 1e-9)).toBe(true);
  });
});

describe("composición del precio", () => {
  it("separa equipo, herramientas de IA, otros gastos, utilidad e IVA y suma el total", () => {
    const c = composicionDelPrecio(ESTIMACION, { lado: "desarrollador" })!;
    expect(c.segmentos.map((s) => s.clave)).toEqual(["equipo", "ia", "otros", "utilidad", "iva"]);
    const equipo = c.segmentos.find((s) => s.clave === "equipo")!;
    expect(equipo.monto).toBeCloseTo(94244 - 22011, 2);
    const ia = c.segmentos.find((s) => s.clave === "ia")!;
    const otros = c.segmentos.find((s) => s.clave === "otros")!;
    // lo indirecto se reparte según la cadena de cálculo y suma lo mismo
    expect(ia.monto + otros.monto).toBeCloseTo(22011, 2);
    expect(ia.monto / otros.monto).toBeCloseTo(5000 / 2500, 5);
    expect(c.segmentos.find((s) => s.clave === "utilidad")!.monto).toBeCloseTo(117805 - 94244, 2);
    expect(c.segmentos.find((s) => s.clave === "iva")!.monto).toBeCloseTo(18848.8, 2);
    expect(c.total).toBeCloseTo(136653.8, 1);
    expect(c.segmentos.reduce((a, s) => a + s.fraccion, 0)).toBeCloseTo(1, 6);
  });

  it("el titular dice la conclusión en centavos, desde la perspectiva de cada cara", () => {
    const dev = composicionDelPrecio(ESTIMACION, { lado: "desarrollador" })!;
    expect(dev.titular).toBe("De cada peso que cobras, 53 centavos van al equipo y 17 centavos son tu utilidad.");
    const solo = composicionDelPrecio(ESTIMACION, { lado: "desarrollador", soloTuTiempo: true })!;
    expect(solo.titular).toContain("pagan tu tiempo");
    expect(solo.segmentos[0].nombre).toBe("Tu tiempo");
    const ayto = composicionDelPrecio(ESTIMACION, { lado: "ayuntamiento" })!;
    expect(ayto.titular).toContain("De cada peso que se paga");
    expect(ayto.titular).toContain("utilidad del proveedor");
    expect(ayto.segmentos.find((s) => s.clave === "utilidad")!.nombre).toBe("Utilidad del proveedor");
  });

  it("el resumen trae todos los montos y el total", () => {
    const c = composicionDelPrecio(ESTIMACION, { lado: "desarrollador" })!;
    expect(c.resumen).toContain("Equipo con cargas $72,233");
    expect(c.resumen).toContain("tu utilidad del 20 % $23,561");
    expect(c.resumen).toContain("IVA $18,849");
    expect(c.resumen.endsWith(": $136,654 con IVA")).toBe(true);
  });

  it("omite los pedazos que valen cero", () => {
    const sinIA = composicionDelPrecio({ ...ESTIMACION, explanationJson: cadena(0, 2500) }, { lado: "desarrollador" })!;
    expect(sinIA.segmentos.map((s) => s.clave)).toEqual(["equipo", "otros", "utilidad", "iva"]);
    const sinIndirecto = composicionDelPrecio({ ...ESTIMACION, indirectCost: 0, explanationJson: cadena(0, 0) }, { lado: "desarrollador" })!;
    expect(sinIndirecto.segmentos.map((s) => s.clave)).toEqual(["equipo", "utilidad", "iva"]);
  });

  it("sin cadena de cálculo (estimación vieja) junta herramientas y otros gastos y no inventa el reparto", () => {
    const c = composicionDelPrecio({ ...ESTIMACION, explanationJson: null, inputsSnapshot: null }, { lado: "desarrollador" })!;
    expect(c.segmentos.map((s) => s.clave)).toEqual(["equipo", "otros", "utilidad", "iva"]);
    expect(c.segmentos[1].nombre).toBe("Herramientas y otros gastos");
    expect(c.segmentos[1].monto).toBeCloseTo(22011, 2);
  });

  it("con las entradas guardadas también puede separar herramientas de otros gastos", () => {
    const c = composicionDelPrecio(
      {
        ...ESTIMACION,
        explanationJson: null,
        inputsSnapshot: JSON.stringify({ herramientas: { mensualMXN: 6000 }, otrosCostosMensuales: { herramientas: 1000, administracion: 1000 } }),
      },
      { lado: "desarrollador" },
    )!;
    expect(c.segmentos.map((s) => s.clave)).toEqual(["equipo", "ia", "otros", "utilidad", "iva"]);
    expect(c.segmentos[1].monto / c.segmentos[2].monto).toBeCloseTo(3, 5);
  });

  it("sin cifras no hay gráfica", () => {
    expect(composicionDelPrecio({ directCost: 0, indirectCost: 0, subtotal: 0, vat: 0, total: 0 }, { lado: "desarrollador" })).toBeNull();
  });
});

describe("las cinco formas de hacerlo", () => {
  const estimaciones: EntradaDeEstimacion[] = [];
  const base: Record<string, [number, number, number]> = {
    traditional: [390812, 459778, 620701],
    ai_assisted: [200486, 235866, 318987],
    hybrid: [159357, 187479, 254280],
    bytecoding_prompts: [116155, 136653, 185856],
    low_code: [57145, 67229, 90814],
  };
  for (const [mode, [o, p, c]] of Object.entries(base)) {
    estimaciones.push({ mode, scenario: "optimistic", total: o, weeksTotal: 20 });
    estimaciones.push({ mode, scenario: "probable", total: p, weeksTotal: 24 });
    estimaciones.push({ mode, scenario: "conservative", total: c, weeksTotal: 30 });
  }
  const aptitud = {
    low_code: { veredicto: "no_recomendable" as const, razones: ["Se conecta con 4 sistemas de afuera; las plataformas de armado se atoran con tantas conexiones."] },
    hybrid: { veredicto: "con_reservas" as const, razones: ["La pericia del equipo es 2.5 de 5: el ahorro es parcial."] },
  };

  it("siempre son cinco filas, con el nombre llano y el técnico aparte", () => {
    const d = filasDeFormas({ estimaciones, aptitud, modoSeleccionado: "bytecoding_prompts", escenario: "probable", modoRecomendado: "bytecoding_prompts" });
    expect(d.filas.map((f) => f.nombre)).toEqual(["A mano", "Con IA", "Híbrido", "Casi todo con IA", "Plataforma de armado"]);
    expect(d.filas.map((f) => f.tecnico)).toEqual(["Tradicional", "Asistido por herramientas generativas", "Híbrido", "Bytecoding (prompts)", "Low-code"]);
    expect(d.filas.map((f) => f.mode)).toEqual(FORMAS_DE_HACERLO.map((f) => f.value));
  });

  it("marca la seleccionada, la recomendada y la descartada con su razón corta", () => {
    const d = filasDeFormas({ estimaciones, aptitud, modoSeleccionado: "hybrid", escenario: "probable", modoRecomendado: "bytecoding_prompts" });
    expect(d.filas.filter((f) => f.seleccionada).map((f) => f.mode)).toEqual(["hybrid"]);
    expect(d.filas.filter((f) => f.recomendada).map((f) => f.mode)).toEqual(["bytecoding_prompts"]);
    const lc = d.filas.find((f) => f.mode === "low_code")!;
    expect(lc.veredicto).toBe("no_recomendable");
    expect(lc.razon).toBe("Se conecta con 4 sistemas de afuera");
    expect(d.filas.find((f) => f.mode === "traditional")!.razon).toBeNull();
  });

  it("todas las posiciones caen dentro de la escala común y la banda va de optimista a conservador", () => {
    const d = filasDeFormas({ estimaciones, aptitud, modoSeleccionado: "hybrid", escenario: "probable" });
    for (const f of d.filas) {
      const p = f.posicion!;
      expect(p.desde).toBeGreaterThanOrEqual(0);
      expect(p.hasta).toBeLessThanOrEqual(100);
      expect(p.desde).toBeLessThanOrEqual(p.marca);
      expect(p.marca).toBeLessThanOrEqual(p.hasta);
    }
    expect(d.tope).toBeGreaterThanOrEqual(620701);
    // la forma más cara llega casi hasta el final de la escala
    expect(d.filas[0].posicion!.hasta).toBeGreaterThan(80);
  });

  it("la cifra de la derecha es la del escenario que se ve", () => {
    const prob = filasDeFormas({ estimaciones, aptitud, modoSeleccionado: "hybrid", escenario: "probable" });
    const cons = filasDeFormas({ estimaciones, aptitud, modoSeleccionado: "hybrid", escenario: "conservative" });
    expect(prob.filas[2].elegido).toBe(187479);
    expect(cons.filas[2].elegido).toBe(254280);
    expect(prob.filas[2].meses).toBeCloseTo(24 / 4.33, 5);
    expect(cons.filas[2].meses).toBeCloseTo(30 / 4.33, 5);
  });

  it("el rango del titular no cuenta las formas descartadas", () => {
    const d = filasDeFormas({ estimaciones, aptitud, modoSeleccionado: "hybrid", escenario: "probable" });
    expect(d.rango).toEqual({ minimo: 136653, maximo: 459778 });
  });

  it("el titular dice la conclusión: de cuánto a cuánto cuesta, sin contar las descartadas", () => {
    const d = filasDeFormas({ estimaciones, aptitud, modoSeleccionado: "hybrid", escenario: "probable" });
    expect(titularDeFormas(d)).toBe("Según cómo se haga, el mismo sistema cuesta de $136,653 a $459,778.");
    const una = filasDeFormas({ estimaciones: estimaciones.filter((e) => e.mode === "hybrid"), aptitud: {}, modoSeleccionado: "hybrid", escenario: "probable" });
    expect(titularDeFormas(una)).toBe("Solo hay una forma de hacerlo calculada.");
    const ninguna = filasDeFormas({ estimaciones: [], aptitud: {}, modoSeleccionado: "hybrid", escenario: "probable" });
    expect(titularDeFormas(ninguna)).toBe("Todavía no hay formas de hacerlo calculadas.");
  });

  it("una forma sin cifras queda sin posición y no rompe la escala", () => {
    const soloUna = estimaciones.filter((e) => e.mode === "hybrid");
    const d = filasDeFormas({ estimaciones: soloUna, aptitud: {}, modoSeleccionado: "hybrid", escenario: "probable" });
    expect(d.conDatos).toBe(1);
    expect(d.rango).toBeNull();
    expect(d.filas.filter((f) => f.posicion === null)).toHaveLength(4);
  });

  it("la razón corta toma el primer pedazo", () => {
    expect(razonCorta(["Maneja datos personales; hay que revisar dónde los guarda."])).toBe("Maneja datos personales");
    expect(razonCorta(["La claridad promedio es 2.1 de 5: generar código sobre requisitos vagos."])).toBe("La claridad promedio es 2.1 de 5");
    expect(razonCorta([])).toBeNull();
  });

  it("nombre llano de cualquier clave", () => {
    expect(nombreDeForma("bytecoding_prompts")).toBe("Casi todo con IA");
    expect(nombreDeForma("algo_nuevo")).toBe("algo nuevo");
  });
});

describe("flujo de efectivo", () => {
  const fila = (monthNumber: number, income: number, payroll: number, tax: number, tools: number, admin: number, accumulated: number) => ({
    monthNumber,
    income,
    payrollOutflow: payroll,
    taxOutflow: tax,
    toolsOutflow: tools,
    adminOutflow: admin,
    netFlow: income - payroll - tax - tools - admin,
    accumulatedFlow: accumulated,
  });
  // Anticipo de 30 %, nada en el mes 2 y el resto al cerrar.
  const filas = [
    fila(1, 40000, 20000, 2000, 1500, 1000, 15500),
    fila(2, 0, 20000, 2000, 1500, 1000, -9000),
    fila(3, 96000, 20000, 2000, 1500, 1000, 62500),
  ];

  it("el peor mes es el de menor saldo acumulado y el bache es lo que se adelanta", () => {
    const m = modeloDeFlujo(filas, 136653)!;
    expect(m.peor).toEqual({ mes: 2, acumulado: -9000 });
    expect(m.bache).toBe(9000);
    expect(m.meses.map((x) => x.esPeor)).toEqual([false, true, false]);
    expect(m.meses[1].gasto).toBe(24500);
    expect(m.porcentajeDelPrecio).toBeCloseTo((9000 / 136653) * 100, 5);
  });

  it("la escala trae el cero y cubre cobros, gastos y saldo", () => {
    const m = modeloDeFlujo(filas)!;
    expect(m.marcas).toContain(0);
    expect(m.maximo).toBeGreaterThanOrEqual(96000);
    expect(m.minimo).toBeLessThanOrEqual(-24500);
  });

  it("la frase dice el mes y cuánto te van a deber", () => {
    const m = modeloDeFlujo(filas, 136653)!;
    expect(fraseDelBache(m, "desarrollador")).toBe("Mes 2: te van a deber $9,000 (el 7 % del precio).");
    expect(fraseDelBache(m, "ayuntamiento")).toBe("Mes 2: el proveedor adelanta $9,000 de su bolsa (el 7 % del precio).");
  });

  it("si el saldo nunca es negativo no hay bache y la frase lo dice", () => {
    const bien = [fila(1, 100000, 20000, 2000, 1500, 1000, 75500), fila(2, 0, 20000, 2000, 1500, 1000, 51000)];
    const m = modeloDeFlujo(bien)!;
    expect(m.peor).toBeNull();
    expect(m.bache).toBe(0);
    expect(fraseDelBache(m, "desarrollador")).toContain("En ningún mes pones dinero de tu bolsa");
  });

  it("sin filas no hay gráfica", () => {
    expect(modeloDeFlujo([])).toBeNull();
  });
});
