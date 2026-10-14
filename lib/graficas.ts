/**
 * Datos de las tres gráficas del resultado: de qué se compone el precio, las
 * cinco formas de hacerlo con su rango y el flujo de efectivo mes a mes.
 *
 * Son funciones puras: reciben lo que ya guarda la base (columnas de la
 * estimación, su cadena de cálculo, las líneas del flujo) y devuelven lo que
 * las gráficas dibujan, para poder probarlas sin pantalla. No inventan nada:
 * todo sale de cifras que el motor ya calculó.
 */
import type { Lado } from "@/lib/lado";
import { FORMAS_DE_HACERLO, NOMBRE_TECNICO_DE_FORMA, nombreDeForma } from "@/lib/formas";

export const SEMANAS_POR_MES = 4.33;

// ---------------------------------------------------------------------------
// Formato
// ---------------------------------------------------------------------------

const formatoPesos = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0, minimumFractionDigits: 0 });

/** "$136,653", sin centavos. Los negativos llevan el signo menos de verdad. */
export function pesos(n: number): string {
  const r = Math.round(n);
  return r < 0 ? `−${formatoPesos.format(-r)}` : formatoPesos.format(r);
}

/** Cifra corta para los ejes: "$0", "$300 mil", "$1.2 M", "−$50 mil". */
export function pesosCompactos(n: number): string {
  const signo = n < 0 ? "−" : "";
  const a = Math.abs(n);
  if (a >= 1_000_000) {
    const m = Math.round((a / 1_000_000) * 10) / 10;
    return `${signo}$${Number.isInteger(m) ? m.toFixed(0) : m.toFixed(1)} M`;
  }
  if (a >= 1_000) return `${signo}$${Math.round(a / 1_000)} mil`;
  return `${signo}$${Math.round(a)}`;
}

/** "2.8 meses", "1 mes". */
export function mesesEnTexto(meses: number): string {
  const r = Math.round(meses * 10) / 10;
  return r === 1 ? "1 mes" : `${r.toFixed(1)} meses`;
}

export const mesesDeSemanas = (semanas: number) => semanas / SEMANAS_POR_MES;

/** Un eje con números redondos: dónde van las marcas y hasta dónde llega el dibujo. */
export interface Escala {
  /** Separación entre marcas (1, 2 o 5 por una potencia de diez). */
  paso: number;
  /** Marcas con número redondo dentro del rango. Incluyen el cero si cae dentro. */
  marcas: number[];
  /** Extremos del dibujo: cubren el rango y se ajustan a medio paso. */
  desde: number;
  hasta: number;
}

/**
 * Elige el paso más grande que deja al menos tres marcas dentro del rango, para
 * que el eje tenga números redondos (0, 200 mil, 400 mil) y no demasiado aire.
 */
export function escalaDe(minimo: number, maximo: number): Escala {
  if (!Number.isFinite(minimo) || !Number.isFinite(maximo) || maximo <= minimo) {
    const hasta = Math.max(1, maximo);
    return { paso: hasta, marcas: [Math.min(0, minimo), hasta], desde: Math.min(0, minimo), hasta };
  }
  const rango = maximo - minimo;
  const potenciaMax = Math.floor(Math.log10(rango));
  let paso = Math.pow(10, potenciaMax - 2);
  buscar: for (let k = potenciaMax; k >= potenciaMax - 3; k--) {
    for (const m of [5, 2, 1]) {
      const candidato = m * Math.pow(10, k);
      const cuantas = Math.floor(maximo / candidato + 1e-9) - Math.ceil(minimo / candidato - 1e-9) + 1;
      if (cuantas >= 3) {
        paso = candidato;
        break buscar;
      }
    }
  }
  const marcas: number[] = [];
  for (let v = Math.ceil(minimo / paso - 1e-9) * paso; v <= maximo + 1e-9; v += paso) marcas.push(Math.round(v * 1e6) / 1e6 + 0); // + 0 evita el cero negativo
  const medio = paso / 2;
  const desde = minimo >= 0 ? 0 : Math.floor(minimo / medio + 1e-9) * medio;
  const hasta = Math.ceil(maximo / medio - 1e-9) * medio;
  return { paso, marcas, desde, hasta };
}

/** Cualquier cifra que venga de la base (número, texto o Decimal de Prisma) a número. */
const num = (v: unknown): number => {
  if (v === null || v === undefined) return 0;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};

const centavos = (n: number) => `${n} ${n === 1 ? "centavo" : "centavos"}`;

// ---------------------------------------------------------------------------
// 1. De qué se compone el precio
// ---------------------------------------------------------------------------

export type ClaveDeSegmento = "equipo" | "ia" | "otros" | "utilidad" | "iva";

export interface SegmentoDeComposicion {
  clave: ClaveDeSegmento;
  nombre: string;
  /** Pesos de ese pedazo del precio. */
  monto: number;
  /** Parte del total, de 0 a 1. */
  fraccion: number;
}

export interface EntradaDeComposicion {
  // Las cifras pueden venir como número, texto o Decimal de Prisma.
  directCost: number | string | { toString(): string };
  indirectCost: number | string | { toString(): string };
  subtotal: number | string | { toString(): string };
  vat: number | string | { toString(): string };
  total: number | string | { toString(): string };
  /** Utilidad sobre el precio sin IVA (0.2 = 20 %). */
  margin?: number | string | { toString(): string } | null;
  /** Cadena de cálculo guardada con la estimación. */
  explanationJson?: string | null;
  /** Entradas con las que se calculó (para estimaciones viejas sin cadena). */
  inputsSnapshot?: string | null;
}

export interface Composicion {
  segmentos: SegmentoDeComposicion[];
  total: number;
  /** La conclusión en una frase: de cada peso, cuánto va al equipo y cuánto es utilidad. */
  titular: string;
  /** Lo mismo en una línea con montos, para el resumen de la cadena de cálculo. */
  resumen: string;
}

/** Herramientas de IA y otros gastos, al mes. null si no hay de dónde sacarlos. */
function gastosMensuales(e: EntradaDeComposicion): { ia: number; otros: number } | null {
  if (e.explanationJson) {
    try {
      const pasos = JSON.parse(e.explanationJson) as Array<{ clave?: string; valor?: number }>;
      if (Array.isArray(pasos) && pasos.some((p) => p.clave === "costo_directo")) {
        const valor = (clave: string) => {
          const p = pasos.find((x) => x.clave === clave);
          return typeof p?.valor === "number" && Number.isFinite(p.valor) ? p.valor : 0;
        };
        // Un renglón que no existe en la cadena es porque valía cero.
        return { ia: valor("herramientas"), otros: valor("otros_costos") };
      }
    } catch {
      // cadena ilegible: se intenta con las entradas
    }
  }
  if (e.inputsSnapshot) {
    try {
      const s = JSON.parse(e.inputsSnapshot) as {
        herramientas?: { mensualMXN?: number };
        otrosCostosMensuales?: { herramientas?: number; administracion?: number };
      };
      if (s.herramientas && typeof s.herramientas.mensualMXN === "number") {
        return {
          ia: s.herramientas.mensualMXN,
          otros: (s.otrosCostosMensuales?.herramientas ?? 0) + (s.otrosCostosMensuales?.administracion ?? 0),
        };
      }
    } catch {
      // sin entradas legibles
    }
  }
  return null;
}

export function composicionDelPrecio(
  e: EntradaDeComposicion,
  opciones: { lado: Lado; soloTuTiempo?: boolean },
): Composicion | null {
  const directo = Math.max(0, num(e.directCost));
  const indirecto = Math.min(Math.max(0, num(e.indirectCost)), directo);
  const equipo = Math.max(0, directo - indirecto);
  const utilidad = Math.max(0, num(e.subtotal) - directo);
  const iva = Math.max(0, num(e.vat));

  // Herramientas de IA contra otros gastos: lo indirecto se reparte según lo
  // que dice la cadena de cálculo, para que la suma siga cuadrando con el costo.
  let ia = 0;
  let otros = indirecto;
  let otrosNombre = "Otros gastos";
  const mensual = gastosMensuales(e);
  if (indirecto > 0) {
    if (mensual && mensual.ia + mensual.otros > 0) {
      ia = (indirecto * mensual.ia) / (mensual.ia + mensual.otros);
      otros = indirecto - ia;
    } else {
      // No se puede separar (estimación vieja): van juntos, sin inventar el reparto.
      otrosNombre = "Herramientas y otros gastos";
    }
  }

  const suma = equipo + ia + otros + utilidad + iva;
  if (suma <= 0) return null;

  const esDev = opciones.lado === "desarrollador";
  const nombreEquipo = esDev && opciones.soloTuTiempo ? "Tu tiempo" : "Equipo con cargas";
  const nombreUtilidad = esDev ? "Tu utilidad" : "Utilidad del proveedor";

  const crudos: Array<[ClaveDeSegmento, string, number]> = [
    ["equipo", nombreEquipo, equipo],
    ["ia", "Herramientas de IA", ia],
    ["otros", otrosNombre, otros],
    ["utilidad", nombreUtilidad, utilidad],
    ["iva", "IVA", iva],
  ];
  const segmentos: SegmentoDeComposicion[] = crudos
    .filter(([, , monto]) => monto > 0.005)
    .map(([clave, nombre, monto]) => ({ clave, nombre, monto, fraccion: monto / suma }));

  const parte = (clave: ClaveDeSegmento) => segmentos.find((s) => s.clave === clave)?.fraccion ?? 0;
  const cEquipo = Math.round(parte("equipo") * 100);
  const cUtilidad = Math.round(parte("utilidad") * 100);

  let titular: string;
  if (esDev) {
    const primera = opciones.soloTuTiempo
      ? `${centavos(cEquipo)} ${cEquipo === 1 ? "paga" : "pagan"} tu tiempo`
      : `${centavos(cEquipo)} ${cEquipo === 1 ? "va" : "van"} al equipo`;
    titular = `De cada peso que cobras, ${primera} y ${centavos(cUtilidad)} ${cUtilidad === 1 ? "es" : "son"} tu utilidad.`;
  } else {
    titular = `De cada peso que se paga, ${centavos(cEquipo)} ${cEquipo === 1 ? "va" : "van"} al equipo y ${centavos(cUtilidad)} ${
      cUtilidad === 1 ? "es" : "son"
    } la utilidad del proveedor.`;
  }

  const margen = num(e.margin);
  const etiquetaUtilidad = margen > 0 ? `${esDev ? "tu utilidad" : "utilidad"} del ${Math.round(margen * 100)} %` : esDev ? "tu utilidad" : "utilidad";
  // "Herramientas de IA" -> "herramientas de IA", pero "IVA" se queda como está.
  const minuscula = (s: string) => (/^[A-ZÁÉÍÓÚÑ]{2,}/.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1));
  const resumen =
    segmentos
      .map((s) => {
        const nombre = s.clave === "utilidad" ? etiquetaUtilidad : s.clave === "equipo" ? s.nombre : minuscula(s.nombre);
        return `${nombre} ${pesos(s.monto)}`;
      })
      .join(", ") + `: ${pesos(suma)} con IVA`;

  return { segmentos, total: suma, titular, resumen };
}

// ---------------------------------------------------------------------------
// 2. Las cinco formas de hacerlo
// ---------------------------------------------------------------------------

export type Veredicto = "apto" | "con_reservas" | "no_recomendable";

export interface EntradaDeEstimacion {
  mode: string;
  scenario: string;
  total: number;
  weeksTotal: number | null;
}

export interface AptitudDeForma {
  veredicto: Veredicto;
  razones: string[];
}

export interface FilaDeForma {
  mode: string;
  nombre: string;
  tecnico: string;
  tieneDatos: boolean;
  optimista: number | null;
  probable: number | null;
  conservador: number | null;
  /** Total del escenario que se está viendo. */
  elegido: number | null;
  /** Meses del escenario que se está viendo. */
  meses: number | null;
  veredicto: Veredicto;
  /** Una frase corta con el motivo (solo si no es "apto"). */
  razon: string | null;
  seleccionada: boolean;
  recomendada: boolean;
  /** Posiciones de 0 a 100 sobre la escala común; null si no hay datos. */
  posicion: { desde: number; hasta: number; marca: number } | null;
}

export interface DatosDeFormas {
  filas: FilaDeForma[];
  /** Extremo de la escala, en pesos. */
  tope: number;
  marcas: number[];
  /** Cuántas formas tienen cifras. */
  conDatos: number;
  /** El precio más bajo y el más alto entre las formas que sirven, en el escenario visto. */
  rango: { minimo: number; maximo: number } | null;
}

/** El primer pedazo de la razón, sin punto final: "Se conecta con 4 sistemas de afuera". */
export function razonCorta(razones: string[] | undefined): string | null {
  const primera = razones?.[0]?.trim();
  if (!primera) return null;
  const corta = primera.split(/[;:]/)[0].trim().replace(/[.]$/, "");
  return corta || primera.replace(/[.]$/, "");
}

/** El titular de la gráfica de formas: la conclusión, no el tema. */
export function titularDeFormas(d: DatosDeFormas): string {
  if (d.conDatos === 0) return "Todavía no hay formas de hacerlo calculadas.";
  if (!d.rango) return d.conDatos === 1 ? "Solo hay una forma de hacerlo calculada." : "Las formas de hacerlo que sirven para este proyecto.";
  return `Según cómo se haga, el mismo sistema cuesta de ${pesos(d.rango.minimo)} a ${pesos(d.rango.maximo)}.`;
}

export function filasDeFormas(args: {
  estimaciones: EntradaDeEstimacion[];
  aptitud: Record<string, AptitudDeForma | undefined>;
  modoSeleccionado: string;
  escenario: string;
  modoRecomendado?: string | null;
}): DatosDeFormas {
  const porClave = (mode: string, scenario: string) =>
    args.estimaciones.find((e) => e.mode === mode && e.scenario === scenario) ?? null;

  const sinPosicion = FORMAS_DE_HACERLO.map((f) => {
    const opt = porClave(f.value, "optimistic");
    const pro = porClave(f.value, "probable");
    const con = porClave(f.value, "conservative");
    const vista = porClave(f.value, args.escenario) ?? pro;
    const apt = args.aptitud[f.value];
    const veredicto: Veredicto = apt?.veredicto ?? "apto";
    return {
      mode: f.value as string,
      nombre: f.nombre,
      tecnico: NOMBRE_TECNICO_DE_FORMA[f.value] ?? f.nombre,
      tieneDatos: !!(opt || pro || con),
      optimista: opt?.total ?? null,
      probable: pro?.total ?? null,
      conservador: con?.total ?? null,
      elegido: vista?.total ?? null,
      meses: vista?.weeksTotal != null ? mesesDeSemanas(vista.weeksTotal) : null,
      veredicto,
      razon: veredicto === "apto" ? null : razonCorta(apt?.razones),
      seleccionada: f.value === args.modoSeleccionado,
      recomendada: f.value === args.modoRecomendado,
    };
  });

  const valores = sinPosicion.flatMap((f) => [f.optimista, f.probable, f.conservador, f.elegido]).filter((v): v is number => v != null);
  const maximoCrudo = valores.length > 0 ? Math.max(...valores) : 0;
  const escala = maximoCrudo > 0 ? escalaDe(0, maximoCrudo) : { marcas: [0], hasta: 1 };
  const marcas = escala.marcas;
  const tope = escala.hasta || 1;
  const pos = (v: number) => Math.min(100, Math.max(0, (v / tope) * 100));

  const filas: FilaDeForma[] = sinPosicion.map((f) => {
    const extremos = [f.optimista, f.probable, f.conservador, f.elegido].filter((v): v is number => v != null);
    const posicion =
      f.tieneDatos && f.elegido != null && extremos.length > 0
        ? { desde: pos(Math.min(...extremos)), hasta: pos(Math.max(...extremos)), marca: pos(f.elegido) }
        : null;
    return { ...f, posicion };
  });

  const sirven = filas.filter((f) => f.elegido != null && f.veredicto !== "no_recomendable").map((f) => f.elegido as number);
  const rango = sirven.length >= 2 ? { minimo: Math.min(...sirven), maximo: Math.max(...sirven) } : null;

  return { filas, tope, marcas, conDatos: filas.filter((f) => f.tieneDatos).length, rango };
}

// ---------------------------------------------------------------------------
// 3. Flujo de efectivo
// ---------------------------------------------------------------------------

type Cifra = number | string | { toString(): string };

export interface MesDeFlujoEntrada {
  monthNumber: number;
  income: Cifra;
  payrollOutflow: Cifra;
  taxOutflow: Cifra;
  toolsOutflow: Cifra;
  adminOutflow: Cifra;
  netFlow: Cifra;
  accumulatedFlow: Cifra;
}

export interface MesDeFlujo {
  mes: number;
  /** Lo que se cobra al cliente ese mes. */
  cobro: number;
  /** Nómina, impuestos, herramientas y administración de ese mes. */
  gasto: number;
  saldoDelMes: number;
  acumulado: number;
  esPeor: boolean;
}

export interface ModeloDeFlujo {
  meses: MesDeFlujo[];
  marcas: number[];
  minimo: number;
  maximo: number;
  /** El mes con el saldo acumulado más bajo, solo si es negativo. */
  peor: { mes: number; acumulado: number } | null;
  /** Lo que se adelanta en el peor mes (positivo); 0 si nunca se pone dinero. */
  bache: number;
  /** El bache como parte del precio, de 0 a 100; null si no se sabe el precio. */
  porcentajeDelPrecio: number | null;
}

export function modeloDeFlujo(filas: MesDeFlujoEntrada[], precioTotal?: number | null): ModeloDeFlujo | null {
  if (filas.length === 0) return null;
  const ordenadas = [...filas].sort((a, b) => a.monthNumber - b.monthNumber);
  const base = ordenadas.map((m) => ({
    mes: m.monthNumber,
    cobro: Math.max(0, num(m.income)),
    gasto: Math.max(0, num(m.payrollOutflow) + num(m.taxOutflow) + num(m.toolsOutflow) + num(m.adminOutflow)),
    saldoDelMes: num(m.netFlow),
    acumulado: num(m.accumulatedFlow),
  }));

  const peorFila = base.reduce((peor, m) => (m.acumulado < peor.acumulado ? m : peor), base[0]);
  const peor = peorFila.acumulado < 0 ? { mes: peorFila.mes, acumulado: peorFila.acumulado } : null;

  const tope = Math.max(0, ...base.map((m) => m.cobro), ...base.map((m) => m.acumulado));
  const fondo = Math.min(0, ...base.map((m) => -m.gasto), ...base.map((m) => m.acumulado));
  if (tope === 0 && fondo === 0) return null;
  const escala = escalaDe(fondo, tope);

  const bache = peor ? -peor.acumulado : 0;
  const precio = precioTotal != null && precioTotal > 0 ? precioTotal : null;
  return {
    meses: base.map((m) => ({ ...m, esPeor: !!peor && m.mes === peor.mes })),
    marcas: escala.marcas,
    minimo: escala.desde,
    maximo: escala.hasta,
    peor,
    bache,
    porcentajeDelPrecio: precio && bache > 0 ? (bache / precio) * 100 : null,
  };
}

/** La frase que va escrita en la gráfica: "Mes 2: te van a deber $19,699 (el 2 % del precio)." */
export function fraseDelBache(m: ModeloDeFlujo, lado: Lado): string {
  const esDev = lado === "desarrollador";
  if (!m.peor) {
    return esDev
      ? "En ningún mes pones dinero de tu bolsa: los cobros alcanzan para los gastos."
      : "En ningún mes el proveedor pone dinero de su bolsa: los cobros alcanzan para los gastos.";
  }
  const pct = m.porcentajeDelPrecio;
  const delPrecio = pct == null ? "" : pct < 1 ? " (menos del 1 % del precio)" : ` (el ${Math.round(pct)} % del precio)`;
  return esDev
    ? `Mes ${m.peor.mes}: te van a deber ${pesos(m.bache)}${delPrecio}.`
    : `Mes ${m.peor.mes}: el proveedor adelanta ${pesos(m.bache)} de su bolsa${delPrecio}.`;
}

export { nombreDeForma };
