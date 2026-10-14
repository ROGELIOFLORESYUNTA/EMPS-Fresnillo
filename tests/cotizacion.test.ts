/**
 * Cotización para el cliente (lib/cotizacion.ts): número, calendario de pagos,
 * cifras congeladas y documento.
 *
 * La regla de fondo: el cliente ve un precio por concepto y nunca la nómina, el
 * costo, la utilidad ni el capital de trabajo del desarrollador.
 */
import { describe, it, expect } from "vitest";
import {
  CONDICIONES_LEGALES,
  EXCLUSIONES_POR_OMISION,
  anioDeCotizacion,
  calendarioDePagos,
  camposPorOmision,
  completarSnapshot,
  congelarCifras,
  consecutivoDeNumero,
  construirDocumento,
  cotizacionGuardarSchema,
  fechaLarga,
  leerSnapshot,
  lineaDeModulo,
  lineasDeTexto,
  mantenimientoDeCotizacion,
  numeroDeCotizacion,
  siguienteConsecutivo,
  siguienteNumero,
  soloCifras,
  supuestosPorOmision,
  textoDeLineas,
  vigenciaHasta,
  type EntradaDeCifras,
} from "@/lib/cotizacion";
import { buildSimpleCashFlow } from "@/lib/engine";

describe("número de cotización COT-AAAA-NNNN", () => {
  it("lleva el año y un consecutivo de cuatro cifras", () => {
    expect(numeroDeCotizacion(2026, 1)).toBe("COT-2026-0001");
    expect(numeroDeCotizacion(2026, 37)).toBe("COT-2026-0037");
    expect(numeroDeCotizacion(2027, 9999)).toBe("COT-2027-9999");
  });

  it("pasando de 9999 sigue con más cifras en vez de cortarse", () => {
    expect(numeroDeCotizacion(2026, 12345)).toBe("COT-2026-12345");
  });

  it("rechaza un año o un consecutivo que no sirven", () => {
    expect(() => numeroDeCotizacion(2026, 0)).toThrow(RangeError);
    expect(() => numeroDeCotizacion(2026, -3)).toThrow(RangeError);
    expect(() => numeroDeCotizacion(2026, 1.5)).toThrow(RangeError);
    expect(() => numeroDeCotizacion(26, 1)).toThrow(RangeError);
  });

  it("lee el consecutivo de un número del mismo año y nada más", () => {
    expect(consecutivoDeNumero("COT-2026-0042", 2026)).toBe(42);
    expect(consecutivoDeNumero("COT-2026-0042", 2027)).toBeNull();
    expect(consecutivoDeNumero("COT-26-0042", 2026)).toBeNull();
    expect(consecutivoDeNumero("FAC-2026-0042", 2026)).toBeNull();
    expect(consecutivoDeNumero("", 2026)).toBeNull();
  });

  it("el siguiente consecutivo es el mayor del año más uno: sin cotizaciones empieza en 1", () => {
    expect(siguienteConsecutivo([], 2026)).toBe(1);
    expect(siguienteConsecutivo(["COT-2026-0001", "COT-2026-0002"], 2026)).toBe(3);
  });

  it("no repite un número aunque se haya borrado alguna (hueco en la lista)", () => {
    expect(siguienteConsecutivo(["COT-2026-0001", "COT-2026-0005"], 2026)).toBe(6);
  });

  it("las cotizaciones de otros años no cuentan: cada año empieza otra vez en 1", () => {
    expect(siguienteConsecutivo(["COT-2025-0099", "COT-2025-0100"], 2026)).toBe(1);
  });

  it("siguienteNumero junta el año de la fecha con el consecutivo", () => {
    const octubre = new Date("2026-10-14T18:00:00Z");
    expect(siguienteNumero([], octubre)).toBe("COT-2026-0001");
    expect(siguienteNumero(["COT-2026-0001", "COT-2026-0002"], octubre)).toBe("COT-2026-0003");
  });

  it("el año se cuenta en hora de México: la medianoche del 31 de diciembre todavía es del año que termina", () => {
    // 03:00 UTC del 1 de enero es 21:00 del 31 de diciembre en la Ciudad de México (UTC-6)
    expect(anioDeCotizacion(new Date("2027-01-01T03:00:00Z"))).toBe(2026);
    expect(anioDeCotizacion(new Date("2027-01-01T07:00:00Z"))).toBe(2027);
  });
});

describe("fechas del documento", () => {
  it("se escriben largas y en español, en hora de México", () => {
    expect(fechaLarga("2026-10-14T18:00:00Z")).toBe("14 de octubre de 2026");
    expect(fechaLarga("no es fecha")).toBe("");
  });

  it("la vigencia cuenta los días desde la fecha de la cotización", () => {
    expect(fechaLarga(vigenciaHasta("2026-10-14T18:00:00Z", 15))).toBe("29 de octubre de 2026");
    expect(fechaLarga(vigenciaHasta("2026-10-14T18:00:00Z", 0))).toBe("14 de octubre de 2026");
  });
});

describe("calendario de pagos", () => {
  const TOTAL = 187478.57;
  const sumaDePagos = (p: { monto: number }[]) => Math.round(p.reduce((a, x) => a + x.monto, 0) * 100) / 100;

  it("30 / 40 / 30 en un proyecto de 6 meses: anticipo, 4 avances y pago final que suman el total", () => {
    const pagos = calendarioDePagos({ total: TOTAL, anticipoPct: 30, finalPct: 30, meses: 6 });
    expect(pagos.map((p) => p.clave)).toEqual(["anticipo", "avance", "avance", "avance", "avance", "final"]);
    expect(pagos[0].porcentaje).toBe(30);
    expect(pagos[1].porcentaje).toBe(10);
    expect(pagos[5].porcentaje).toBe(30);
    expect(sumaDePagos(pagos)).toBe(TOTAL);
  });

  it("siempre suman el total, con centavos y para cualquier duración y reparto", () => {
    for (const meses of [0.4, 1, 1.6, 2, 3, 4.2, 6, 10]) {
      for (const [ant, fin] of [[30, 30], [0, 100], [50, 50], [100, 0], [20, 10], [0, 0], [33, 33]]) {
        const pagos = calendarioDePagos({ total: TOTAL, anticipoPct: ant, finalPct: fin, meses });
        expect(sumaDePagos(pagos), `meses ${meses}, ${ant}/${fin}`).toBe(TOTAL);
        const pct = pagos.reduce((a, p) => a + p.porcentaje, 0);
        expect(Math.abs(pct - 100), `porcentajes, meses ${meses}, ${ant}/${fin}`).toBeLessThan(0.05);
      }
    }
  });

  it("el anticipo y el pago final son los mismos que los del flujo de efectivo del proyecto", () => {
    const meses = 5;
    const flujo = buildSimpleCashFlow({
      totalContractAmount: TOTAL,
      anticipoPct: 0.3,
      finalPaymentPct: 0.3,
      monthlyOutflowPayroll: 0,
      monthlyOutflowTaxes: 0,
      monthlyOutflowTools: 0,
      monthlyOutflowAdmin: 0,
      durationMonths: meses,
    });
    const pagos = calendarioDePagos({ total: TOTAL, anticipoPct: 30, finalPct: 30, meses });
    // Los centavos que sobran o faltan por redondear se ajustan en el último pago: diferencia de un centavo a lo más.
    expect(pagos[0].monto).toBeCloseTo(flujo.months[0].income, 2);
    expect(Math.abs(pagos[pagos.length - 1].monto - flujo.months[meses - 1].income)).toBeLessThanOrEqual(0.011);
  });

  it("el flujo de efectivo y el calendario de la cotización cobran el contrato completo", () => {
    const flujo = buildSimpleCashFlow({
      totalContractAmount: TOTAL,
      anticipoPct: 0.3,
      finalPaymentPct: 0.3,
      monthlyOutflowPayroll: 0,
      monthlyOutflowTaxes: 0,
      monthlyOutflowTools: 0,
      monthlyOutflowAdmin: 0,
      durationMonths: 6,
    });
    const cobradoPorElFlujo = flujo.months.reduce((a, m) => a + m.income, 0);
    expect(cobradoPorElFlujo).toBeCloseTo(TOTAL, 2);
    expect(sumaDePagos(calendarioDePagos({ total: TOTAL, anticipoPct: 30, finalPct: 30, meses: 6 }))).toBe(TOTAL);
  });

  it("en menos de 3 meses hay un solo pago por avance, a la mitad del proyecto", () => {
    for (const meses of [0.5, 1, 2]) {
      const pagos = calendarioDePagos({ total: 100000, anticipoPct: 30, finalPct: 30, meses });
      expect(pagos.filter((p) => p.clave === "avance")).toHaveLength(1);
      expect(pagos.find((p) => p.clave === "avance")!.cuando).toBe("A la mitad del proyecto");
    }
  });

  it("de 3 meses en adelante hay un avance por cada mes de en medio", () => {
    expect(calendarioDePagos({ total: 100000, anticipoPct: 30, finalPct: 30, meses: 3 }).filter((p) => p.clave === "avance")).toHaveLength(1);
    expect(calendarioDePagos({ total: 100000, anticipoPct: 30, finalPct: 30, meses: 4.2 }).filter((p) => p.clave === "avance")).toHaveLength(3);
  });

  it("si el anticipo y el final suman 100 no hay avances; sin anticipo no hay renglón de anticipo", () => {
    const sinAvances = calendarioDePagos({ total: 100000, anticipoPct: 50, finalPct: 50, meses: 6 });
    expect(sinAvances.map((p) => p.clave)).toEqual(["anticipo", "final"]);
    const sinAnticipo = calendarioDePagos({ total: 100000, anticipoPct: 0, finalPct: 100, meses: 6 });
    expect(sinAnticipo.map((p) => p.clave)).toEqual(["final"]);
  });

  it("un pago final que no cabe se recorta para no pasar de 100 %", () => {
    const pagos = calendarioDePagos({ total: 100000, anticipoPct: 80, finalPct: 80, meses: 6 });
    expect(pagos.map((p) => p.clave)).toEqual(["anticipo", "final"]);
    expect(sumaDePagos(pagos)).toBe(100000);
    expect(pagos[1].porcentaje).toBe(20);
  });

  it("con total en cero todos los pagos valen cero", () => {
    expect(sumaDePagos(calendarioDePagos({ total: 0, anticipoPct: 30, finalPct: 30, meses: 4 }))).toBe(0);
  });
});

describe("mantenimiento", () => {
  it("sin incluirlo no hay monto", () => {
    expect(mantenimientoDeCotizacion({ incluye: false, capturado: 5000, total: 100000 })).toEqual({ incluido: false, mensual: null, esSugerido: false });
  });

  it("sin monto capturado se sugiere 2 % del precio por mes", () => {
    expect(mantenimientoDeCotizacion({ incluye: true, capturado: null, total: 150000 })).toEqual({ incluido: true, mensual: 3000, esSugerido: true });
  });

  it("el monto que escribe la persona manda sobre el sugerido; cero o negativo vale como vacío", () => {
    expect(mantenimientoDeCotizacion({ incluye: true, capturado: 4500, total: 150000 })).toEqual({ incluido: true, mensual: 4500, esSugerido: false });
    expect(mantenimientoDeCotizacion({ incluye: true, capturado: 0, total: 150000 }).esSugerido).toBe(true);
    expect(mantenimientoDeCotizacion({ incluye: true, capturado: -5, total: 150000 }).esSugerido).toBe(true);
  });
});

describe("una línea por pieza del sistema", () => {
  it("toma la primera frase de la descripción", () => {
    expect(
      lineaDeModulo({ name: "Cobros", description: "Registra el pago de cada consulta. Se conecta con la terminal bancaria." }),
    ).toBe("Registra el pago de cada consulta.");
  });

  it("sin descripción dice qué tipo de pieza es y cuánto lleva", () => {
    expect(lineaDeModulo({ name: "X", type: "reporte", screensCount: 1, reportsCount: 2, integrationsCount: 0 })).toBe(
      "Reportes: 1 pantalla, 2 reportes.",
    );
    expect(lineaDeModulo({ name: "X", type: "integracion", integrationsCount: 1, sensitiveData: true })).toBe(
      "Conexión con otro sistema: 1 conexión con otro sistema, maneja datos personales.",
    );
    expect(lineaDeModulo({ name: "X" })).toBe("Pieza del sistema.");
  });

  it("una descripción larguísima se corta para que quepa en una línea", () => {
    const linea = lineaDeModulo({ name: "X", description: "a".repeat(400) });
    expect(linea.length).toBeLessThanOrEqual(160);
    expect(linea.endsWith("...")).toBe(true);
  });
});

// ------------------------------------------------------------
// Cifras congeladas
// ------------------------------------------------------------

const AHORA = new Date("2026-10-14T18:00:00Z");

function entrada(sobre: Partial<EntradaDeCifras["estimacion"]> = {}): EntradaDeCifras {
  return {
    estimacion: {
      id: "est1",
      version: 4,
      mode: "hybrid",
      scenario: "probable",
      subtotal: 161619.46,
      vat: 25859.11,
      total: 187478.57,
      weeksTotal: 18.19,
      directCost: 129295.57,
      margin: 0.2,
      createdAt: "2026-10-10T15:00:00Z",
      ...sobre,
    },
    modulos: [
      { name: "Agenda", description: "El paciente pide su cita desde el celular." },
      { name: "Reportes", type: "reporte", screensCount: 1, reportsCount: 2 },
    ],
    factorHorasCambios: 0.8,
    licencias: null,
    ahora: AHORA,
  };
}

const CAMPOS = {
  anticipoPct: 30,
  finalPct: 30,
  incluyeMantenimiento: true,
  mantenimientoMensual: null,
};

describe("cifras congeladas de la cotización", () => {
  it("lleva el precio, el tiempo y las piezas", () => {
    const c = congelarCifras(entrada());
    expect(c.subtotal).toBe(161619.46);
    expect(c.iva).toBe(25859.11);
    expect(c.total).toBe(187478.57);
    expect(c.tasaIva).toBeCloseTo(0.16, 4);
    expect(c.semanas).toBe(18.19);
    expect(c.meses).toBeCloseTo(18.19 / 4.33, 2);
    expect(c.modulos.map((m) => m.nombre)).toEqual(["Agenda", "Reportes"]);
    expect(c.modulos[0].linea).toBe("El paciente pide su cita desde el celular.");
    expect(c.estimacion).toMatchObject({ id: "est1", version: 4, mode: "hybrid", scenario: "probable" });
    expect(c.estimacion.calculadaEl).toBe("2026-10-10T15:00:00.000Z");
  });

  it("el precio de cada tipo de cambio sale con margen e IVA, de menor a mayor, para los seis tipos", () => {
    const c = congelarCifras(entrada());
    expect(c.precioDeCambios.map((f) => f.type)).toEqual([
      "correccion",
      "garantia",
      "ajuste_menor",
      "mejora",
      "nuevo_alcance",
      "cambio_estructural",
    ]);
    for (const f of c.precioDeCambios) {
      expect(f.minConIva).toBeGreaterThan(0);
      expect(f.maxConIva).toBeGreaterThan(f.minConIva);
    }
    // Una mejora cuesta más que una corrección menor.
    const por = Object.fromEntries(c.precioDeCambios.map((f) => [f.type, f]));
    expect(por.mejora.minConIva).toBeGreaterThan(por.correccion.maxConIva);
  });

  it("el precio de un cambio incluye margen e IVA: es más que el costo con IVA", () => {
    const sinMargen = congelarCifras(entrada({ margin: 0 }));
    const conMargen = congelarCifras(entrada({ margin: 0.2 }));
    // Costo / (1 - 0.2) = costo × 1.25
    expect(conMargen.precioDeCambios[0].minConIva / sinMargen.precioDeCambios[0].minConIva).toBeCloseTo(1.25, 2);
  });

  it("el costo, el margen y la tarifa semanal no se guardan en ninguna parte", () => {
    const texto = JSON.stringify(completarSnapshot(congelarCifras(entrada()), CAMPOS));
    for (const prohibido of ["directCost", "margin", "indirectCost", "payroll", "nomina", "salary", "isr", "capital"]) {
      expect(texto.toLowerCase(), prohibido).not.toContain(prohibido.toLowerCase());
    }
    expect(texto).not.toContain("129295");
  });

  it("sin semanas calculadas no hay tarifa y los precios de cambios quedan en cero", () => {
    const c = congelarCifras(entrada({ weeksTotal: null }));
    expect(c.semanas).toBe(0);
    expect(c.precioDeCambios.every((f) => f.maxConIva === 0)).toBe(true);
  });

  it("el snapshot completo agrega el mantenimiento y el calendario de pagos", () => {
    const s = completarSnapshot(congelarCifras(entrada()), CAMPOS);
    expect(s.mantenimiento).toEqual({ incluido: true, mensual: 3749.57, esSugerido: true });
    expect(s.pagos.map((p) => p.clave)).toEqual(["anticipo", "avance", "avance", "avance", "final"]);
    expect(Math.round(s.pagos.reduce((a, p) => a + p.monto, 0) * 100) / 100).toBe(187478.57);
  });

  it("se guarda como texto y se vuelve a leer igual; un texto roto o de otra versión se descarta", () => {
    const s = completarSnapshot(congelarCifras(entrada()), CAMPOS);
    expect(leerSnapshot(JSON.stringify(s))).toEqual(s);
    expect(leerSnapshot("{no es json")).toBeNull();
    expect(leerSnapshot(JSON.stringify({ ...s, version: 2 }))).toBeNull();
    expect(leerSnapshot("")).toBeNull();
    expect(leerSnapshot(null)).toBeNull();
  });

  it("soloCifras quita lo que se deriva de los campos", () => {
    const s = completarSnapshot(congelarCifras(entrada()), CAMPOS);
    const c = soloCifras(s);
    expect(c).not.toHaveProperty("pagos");
    expect(c).not.toHaveProperty("mantenimiento");
    expect(c.total).toBe(s.total);
  });
});

// ------------------------------------------------------------
// Campos y documento
// ------------------------------------------------------------

describe("campos por omisión", () => {
  const campos = camposPorOmision({
    proveedorNombre: "  Rogelio Flores  ",
    clienteNombre: "Clínica Dental Sonrisa",
    mode: "hybrid",
    scenario: "probable",
    fechaParametros: "2026-10-10T15:00:00Z",
    ahora: AHORA,
  });

  it("arranca con 15 días de vigencia, 30 % de anticipo, 30 % de pago final y mantenimiento incluido", () => {
    expect(campos).toMatchObject({
      numero: null,
      vigenciaDias: 15,
      anticipoPct: 30,
      finalPct: 30,
      incluyeMantenimiento: true,
      mantenimientoMensual: null,
      proveedorNombre: "Rogelio Flores",
      clienteNombre: "Clínica Dental Sonrisa",
    });
  });

  it("trae los tres supuestos: parámetros con fecha, disponibilidad del cliente y forma de hacerlo", () => {
    expect(campos.supuestos).toHaveLength(3);
    expect(campos.supuestos[0]).toContain("10 de octubre de 2026");
    expect(campos.supuestos[1]).toContain("Clínica Dental Sonrisa");
    expect(campos.supuestos[2]).toContain("mitad a mano y mitad con herramientas de IA");
    expect(campos.supuestos[2]).toContain("probable");
  });

  it("trae lo que no se incluye, copia de la lista base", () => {
    expect(campos.exclusiones).toEqual([...EXCLUSIONES_POR_OMISION]);
    expect(campos.exclusiones).not.toBe(EXCLUSIONES_POR_OMISION);
  });

  it("sin fecha de parámetros el supuesto sigue diciendo de dónde salen los precios", () => {
    const s = supuestosPorOmision({ clienteNombre: "", mode: "traditional", scenario: "conservative", fechaParametros: null });
    expect(s[0]).toContain("parámetros vigentes a la fecha de esta cotización");
    expect(s[1].startsWith("El cliente")).toBe(true);
  });
});

describe("renglones de texto", () => {
  it("quita renglones vacíos, espacios y viñetas escritas a mano", () => {
    expect(lineasDeTexto("- Uno\n\n  * Dos  \r\n• Tres\n   \nCuatro")).toEqual(["Uno", "Dos", "Tres", "Cuatro"]);
  });

  it("ida y vuelta", () => {
    expect(lineasDeTexto(textoDeLineas(["A", "B"]))).toEqual(["A", "B"]);
  });
});

describe("el documento", () => {
  const cifras = congelarCifras(entrada());
  const campos = { ...camposPorOmision({ proveedorNombre: "Rogelio Flores", clienteNombre: "Clínica Dental Sonrisa", mode: "hybrid", scenario: "probable", fechaParametros: cifras.estimacion.calculadaEl, ahora: AHORA }), numero: "COT-2026-0001" };
  const doc = construirDocumento({ campos, cifras, proyecto: { nombre: "Sistema de citas", objetivo: "Dejar la libreta." }, acumulado: null });

  it("junta el encabezado, el cliente, la opción, el precio y el tiempo", () => {
    expect(doc.numero).toBe("COT-2026-0001");
    expect(doc.fechaTexto).toBe("14 de octubre de 2026");
    expect(doc.vigenciaDias).toBe(15);
    expect(doc.vigenciaHastaTexto).toBe("29 de octubre de 2026");
    expect(doc.proveedor.nombre).toBe("Rogelio Flores");
    expect(doc.cliente).toBe("Clínica Dental Sonrisa");
    expect(doc.opcion.linea).toBe(
      "Se construye mitad a mano y mitad con herramientas de IA. Escenario probable: el precio y el plazo más realistas.",
    );
    expect(doc.precio).toEqual({ subtotal: 161619.46, iva: 25859.11, total: 187478.57, tasaIvaPct: 16 });
    expect(doc.tiempo.semanas).toBe(18.19);
  });

  it("lleva las tres condiciones legales con su fundamento", () => {
    expect(doc.condiciones).toBe(CONDICIONES_LEGALES);
    expect(doc.condiciones).toHaveLength(3);
    expect(doc.condiciones[0]).toContain("Los cambios al alcance se cotizan por escrito y con precio antes de hacerse (Código Civil Federal, art. 2627)");
    expect(doc.condiciones[1]).toContain("La cesión de derechos del programa se pacta por escrito (Ley Federal del Derecho de Autor, arts. 30 y 83)");
    expect(doc.condiciones[2]).toContain(
      "Forma y plazo de pago pactados; sin pacto, el pago es exigible a diez días y el interés moratorio es de 6 % anual (Código de Comercio, arts. 83 y 362)",
    );
  });

  it("el calendario de pagos sigue los porcentajes de los campos de hoy", () => {
    const otro = construirDocumento({ campos: { ...campos, anticipoPct: 50, finalPct: 50 }, cifras, proyecto: { nombre: "X", objetivo: null } });
    expect(otro.pagos.map((p) => p.clave)).toEqual(["anticipo", "final"]);
    expect(otro.pagos[0].monto).toBeCloseTo(187478.57 / 2, 1);
  });

  it("sin mantenimiento dice que no se incluye; con monto propio usa ese", () => {
    const sin = construirDocumento({ campos: { ...campos, incluyeMantenimiento: false }, cifras, proyecto: { nombre: "X", objetivo: null } });
    expect(sin.mantenimiento.incluido).toBe(false);
    expect(sin.mantenimiento.mensual).toBeNull();
    const propio = construirDocumento({ campos: { ...campos, mantenimientoMensual: 4200 }, cifras, proyecto: { nombre: "X", objetivo: null } });
    expect(propio.mantenimiento).toMatchObject({ incluido: true, mensual: 4200, esSugerido: false });
  });

  it("los cambios ya aceptados se anotan solo si hay alguno", () => {
    const base = { precioPactado: 161619.46, aceptados: 0, monto: 0, porcentaje: 0, excede: false, limitePct: 20 };
    expect(construirDocumento({ campos, cifras, proyecto: { nombre: "X", objetivo: null }, acumulado: base }).acumulado).toBeNull();
    const con = construirDocumento({ campos, cifras, proyecto: { nombre: "X", objetivo: null }, acumulado: { ...base, aceptados: 2, monto: 16161.94, porcentaje: 10 } });
    expect(con.acumulado).toMatchObject({ aceptados: 2, porcentaje: 10 });
  });

  it("nada del documento habla de nómina, costo, utilidad, margen ni capital de trabajo", () => {
    const texto = JSON.stringify(doc).toLowerCase();
    for (const prohibido of ["nómina", "nomina", "utilidad", "capital", "margen", "costo", "payroll", "isr"]) {
      expect(texto, prohibido).not.toContain(prohibido);
    }
  });

  it("lo mismo en los tres escenarios: ninguna frase del escenario habla de margen", () => {
    for (const scenario of ["optimistic", "probable", "conservative"]) {
      const d = construirDocumento({ campos: { ...campos, scenario }, cifras, proyecto: { nombre: "X", objetivo: null } });
      expect(JSON.stringify(d).toLowerCase(), scenario).not.toContain("margen");
    }
  });

  it("las exclusiones y supuestos por omisión tampoco usan esas palabras", () => {
    const texto = [...EXCLUSIONES_POR_OMISION, ...campos.supuestos].join(" ").toLowerCase();
    // El IMSS aparece en lo que no se incluye (conexión con el IMSS), no como costo.
    for (const prohibido of ["nómina", "nomina", "utilidad", "capital", "margen", "costo"]) {
      expect(texto, prohibido).not.toContain(prohibido);
    }
  });
});

describe("lo que se recibe al guardar", () => {
  const bueno = {
    vigenciaDias: 15,
    proveedorNombre: "Rogelio Flores",
    proveedorRfc: "  fora800101ab1 ",
    proveedorContacto: "",
    clienteNombre: "Clínica Dental Sonrisa",
    mode: "hybrid",
    scenario: "probable",
    exclusiones: ["Una cosa", "Otra"],
    supuestos: ["Uno"],
    incluyeMantenimiento: true,
    mantenimientoMensual: 0,
    anticipoPct: 30,
    finalPct: 30,
    notas: "",
  };

  it("acepta una cotización completa y limpia los textos", () => {
    const r = cotizacionGuardarSchema.parse(bueno);
    expect(r.proveedorRfc).toBe("FORA800101AB1");
    expect(r.proveedorContacto).toBeNull();
    expect(r.notas).toBeNull();
    expect(r.mantenimientoMensual).toBeNull();
  });

  it("rechaza un anticipo y un pago final que suman más de 100 %", () => {
    const r = cotizacionGuardarSchema.safeParse({ ...bueno, anticipoPct: 60, finalPct: 50 });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].message).toBe("El anticipo y el pago final no pueden sumar más de 100 %.");
  });

  it("pide nombre de quien cotiza y de su cliente", () => {
    expect(cotizacionGuardarSchema.safeParse({ ...bueno, proveedorNombre: " " }).success).toBe(false);
    expect(cotizacionGuardarSchema.safeParse({ ...bueno, clienteNombre: "" }).success).toBe(false);
  });

  it("revisa el RFC solo si lo escribieron", () => {
    expect(cotizacionGuardarSchema.safeParse({ ...bueno, proveedorRfc: "12345" }).success).toBe(false);
    expect(cotizacionGuardarSchema.safeParse({ ...bueno, proveedorRfc: null }).success).toBe(true);
    expect(cotizacionGuardarSchema.safeParse({ ...bueno, proveedorRfc: undefined }).success).toBe(true);
  });

  it("la forma de hacerlo y el escenario deben ser de los conocidos", () => {
    expect(cotizacionGuardarSchema.safeParse({ ...bueno, mode: "magia" }).success).toBe(false);
    expect(cotizacionGuardarSchema.safeParse({ ...bueno, scenario: "raro" }).success).toBe(false);
  });

  it("la vigencia va de 1 a 365 días", () => {
    expect(cotizacionGuardarSchema.safeParse({ ...bueno, vigenciaDias: 0 }).success).toBe(false);
    expect(cotizacionGuardarSchema.safeParse({ ...bueno, vigenciaDias: 366 }).success).toBe(false);
    expect(cotizacionGuardarSchema.safeParse({ ...bueno, vigenciaDias: 30 }).success).toBe(true);
  });
});
