/**
 * Cotización para el cliente (cara del desarrollador): la parte pura.
 *
 * Es lo que el desarrollador le entrega a su cliente. Lleva el precio, el
 * tiempo, lo que se construye y lo que no, el precio de los cambios, el
 * mantenimiento y la forma de pago, con las condiciones que la ley pide por
 * escrito. NO lleva nómina, costo, utilidad ni capital de trabajo: esas cifras
 * son del desarrollador y no entran a este archivo ni al documento.
 *
 * Aquí viven el formato del número (COT-AAAA-NNNN), el calendario de pagos, las
 * cifras que se congelan al guardar y el armado del documento. Sin Prisma y sin
 * Next, para poder usarlo igual en el servidor, en el navegador (la vista
 * previa del formulario) y en las pruebas. El servidor junta los datos en
 * lib/cotizacion-server.ts.
 */
import { z } from "zod";
import { SEMANAS_POR_MES } from "./engine/equipo";
import {
  computeChangeRangeByType,
  computeMaintenanceMonthly,
  preciosDeCambioPorTipo,
} from "./engine/reports-insights";
import type { AcumuladoDeCambios } from "./cambios-acumulados";

// ============================================================
// Catálogos
// ============================================================

export const MODOS = ["traditional", "ai_assisted", "hybrid", "bytecoding_prompts", "low_code"] as const;
export const ESCENARIOS = ["optimistic", "probable", "conservative"] as const;

export const VIGENCIA_POR_OMISION = 15;
export const ANTICIPO_POR_OMISION = 30;
export const FINAL_POR_OMISION = 30;

/** Zona horaria con la que se cuentan las fechas del documento (el sitio es de México). */
const ZONA_HORARIA = "America/Mexico_City";

/** La forma de hacerlo, dicha para quien no es del oficio. */
export const FRASE_DE_MODO: Record<string, string> = {
  traditional: "programado a mano por completo",
  ai_assisted: "programado a mano con ayuda de herramientas de IA",
  hybrid: "mitad a mano y mitad con herramientas de IA",
  bytecoding_prompts: "casi todo generado con IA, con revisión y pruebas hechas por una persona",
  low_code: "armado con una plataforma visual, casi sin programar",
};

/** El escenario, dicho para quien no es del oficio. */
export const ESCENARIO_PARA_CLIENTE: Record<string, { nombre: string; frase: string }> = {
  optimistic: { nombre: "optimista", frase: "el precio y el plazo si todo sale a la primera" },
  probable: { nombre: "probable", frase: "el precio y el plazo más realistas" },
  conservative: { nombre: "conservador", frase: "el precio y el plazo con holgura para imprevistos" },
};

/** Las tres condiciones que la ley pide dejar por escrito. */
export const CONDICIONES_LEGALES: readonly string[] = [
  "Los cambios al alcance se cotizan por escrito y con precio antes de hacerse (Código Civil Federal, art. 2627).",
  "La cesión de derechos del programa se pacta por escrito (Ley Federal del Derecho de Autor, arts. 30 y 83).",
  "Forma y plazo de pago pactados; sin pacto, el pago es exigible a diez días y el interés moratorio es de 6 % anual (Código de Comercio, arts. 83 y 362).",
];

/** Qué cubre el mantenimiento mensual, en una línea. */
export const COBERTURA_DE_MANTENIMIENTO =
  "Corrección de errores, ajustes menores y soporte después de la entrega. Los cambios al alcance se cotizan aparte.";

/** Lo que no se incluye casi nunca, para empezar. La persona lo ajusta a su caso. */
export const EXCLUSIONES_POR_OMISION: readonly string[] = [
  "Timbrado fiscal de facturas o recibos, ni declaraciones ante el SAT",
  "Conexión directa con el SAT, el IMSS o bancos, ni firma electrónica",
  "Gestión de contratos o licitaciones públicas",
  "Asesoría contable, fiscal o legal (esta cotización no es un dictamen)",
  "Mantenimiento después de la entrega, salvo que se contrate (ver el apartado de mantenimiento)",
];

// ============================================================
// Número de cotización: COT-AAAA-NNNN
// ============================================================

const PATRON_NUMERO = /^COT-(\d{4})-(\d{4,})$/;

/** Año de una fecha, contado en hora de México (cerca del 1 de enero la hora del servidor puede dar otro año). */
export function anioDeCotizacion(fecha: Date): number {
  return Number(new Intl.DateTimeFormat("en-CA", { year: "numeric", timeZone: ZONA_HORARIA }).format(fecha));
}

/** COT-2026-0001: año y consecutivo de cuatro cifras. Pasando de 9999 sigue con más cifras. */
export function numeroDeCotizacion(anio: number, consecutivo: number): string {
  if (!Number.isInteger(anio) || anio < 1000 || anio > 9999) throw new RangeError(`Año no válido: ${anio}`);
  if (!Number.isInteger(consecutivo) || consecutivo < 1) throw new RangeError(`Consecutivo no válido: ${consecutivo}`);
  return `COT-${anio}-${String(consecutivo).padStart(4, "0")}`;
}

/** El consecutivo de un número de ese año; null si el texto no es un número de cotización de ese año. */
export function consecutivoDeNumero(numero: string, anio: number): number | null {
  const m = PATRON_NUMERO.exec(numero.trim());
  if (!m || Number(m[1]) !== anio) return null;
  return Number(m[2]);
}

/**
 * Siguiente consecutivo del año: el mayor que ya existe más uno. Sin
 * cotizaciones ese año empieza en 1. Con la lista completa del año da lo mismo
 * que contar y sumar uno, pero no repite un número si alguna se borró.
 */
export function siguienteConsecutivo(numerosExistentes: readonly string[], anio: number): number {
  let mayor = 0;
  for (const n of numerosExistentes) {
    const c = consecutivoDeNumero(n, anio);
    if (c !== null && c > mayor) mayor = c;
  }
  return mayor + 1;
}

/** El número que le toca a una cotización nueva de esa fecha, dados los números que ya tiene quien cotiza. */
export function siguienteNumero(numerosExistentes: readonly string[], fecha: Date): string {
  const anio = anioDeCotizacion(fecha);
  return numeroDeCotizacion(anio, siguienteConsecutivo(numerosExistentes, anio));
}

// ============================================================
// Fechas
// ============================================================

const aFecha = (f: Date | string): Date => (f instanceof Date ? f : new Date(f));

/** 14 de octubre de 2026 */
export function fechaLarga(f: Date | string): string {
  const d = aFecha(f);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "long", year: "numeric", timeZone: ZONA_HORARIA }).format(d);
}

/** La fecha hasta la que vale la cotización: la fecha más los días de vigencia. */
export function vigenciaHasta(f: Date | string, dias: number): Date {
  const d = aFecha(f);
  return new Date(d.getTime() + Math.max(0, Math.floor(dias)) * 24 * 60 * 60 * 1000);
}

// ============================================================
// Calendario de pagos
// ============================================================

export interface PagoDeCotizacion {
  clave: "anticipo" | "avance" | "final";
  concepto: string;
  cuando: string;
  /** De 0 a 100. Los avances reparten en partes iguales lo que no es anticipo ni pago final. */
  porcentaje: number;
  /** Con IVA. */
  monto: number;
}

const redondear2 = (n: number) => Math.round(n * 100) / 100;
const acotar = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/**
 * Cómo se paga el total: anticipo al firmar, pagos por avance y pago final al
 * entregar. Misma forma que el flujo de efectivo del proyecto
 * (buildSimpleCashFlow): anticipo en el mes 1, pagos parciales en los meses de
 * en medio y el final en el último.
 *
 * A diferencia de ese flujo, aquí los pagos SIEMPRE suman el total: el flujo
 * reparte lo que no es anticipo ni final entre (meses - 1) pagos pero solo
 * hay (meses - 2) meses de en medio, y deja sin cobrar una parte. En una
 * cotización eso sería un precio que no cuadra. Los centavos que sobren o
 * falten por redondear se ajustan en el último pago.
 *
 *  - de 3 meses en adelante: un pago por avance en cada mes de en medio.
 *  - de menos de 3 meses: un solo pago por avance, a la mitad del proyecto.
 *  - sin porcentaje para avances (anticipo + final = 100): no hay avances.
 */
export function calendarioDePagos(input: {
  total: number;
  anticipoPct: number;
  finalPct: number;
  meses: number;
}): PagoDeCotizacion[] {
  const total = Math.max(0, Number(input.total) || 0);
  const anticipo = acotar(Math.round(Number(input.anticipoPct) || 0), 0, 100);
  const final = acotar(Math.round(Number(input.finalPct) || 0), 0, 100 - anticipo);
  const avance = 100 - anticipo - final;
  const mesesEnteros = Math.max(1, Math.ceil(Number(input.meses) || 1));
  const numAvances = avance > 0 ? (mesesEnteros >= 3 ? mesesEnteros - 2 : 1) : 0;

  const filas: Omit<PagoDeCotizacion, "monto">[] = [];
  if (anticipo > 0) {
    filas.push({ clave: "anticipo", concepto: "Anticipo", cuando: "Al firmar la cotización", porcentaje: anticipo });
  }
  for (let i = 1; i <= numAvances; i++) {
    filas.push({
      clave: "avance",
      concepto: numAvances === 1 ? "Pago por avance" : `Avance ${i} de ${numAvances}`,
      cuando: mesesEnteros >= 3 ? `Mes ${i + 1}, contra avance` : "A la mitad del proyecto",
      porcentaje: avance / numAvances,
    });
  }
  if (final > 0) {
    filas.push({ clave: "final", concepto: "Pago final", cuando: "Al entregar y aceptar el sistema", porcentaje: final });
  }

  const montos = filas.map((f) => redondear2((total * f.porcentaje) / 100));
  if (montos.length > 0) {
    const diferencia = redondear2(total - montos.reduce((a, m) => a + m, 0));
    montos[montos.length - 1] = redondear2(montos[montos.length - 1] + diferencia);
  }
  return filas.map((f, i) => ({ ...f, porcentaje: Math.round(f.porcentaje * 100) / 100, monto: montos[i] }));
}

// ============================================================
// Mantenimiento
// ============================================================

export interface MantenimientoDeCotizacion {
  incluido: boolean;
  /** Pesos al mes con IVA incluido; null si no se incluye. */
  mensual: number | null;
  /** true = es el sugerido (2 % del precio por mes), false = lo capturó la persona. */
  esSugerido: boolean;
}

/** El monto mensual del mantenimiento: lo que capturó la persona, o 2 % del total por mes. */
export function mantenimientoDeCotizacion(input: {
  incluye: boolean;
  capturado: number | null | undefined;
  total: number;
}): MantenimientoDeCotizacion {
  if (!input.incluye) return { incluido: false, mensual: null, esSugerido: false };
  const capturado = typeof input.capturado === "number" && Number.isFinite(input.capturado) && input.capturado > 0 ? input.capturado : null;
  if (capturado !== null) return { incluido: true, mensual: redondear2(capturado), esSugerido: false };
  return { incluido: true, mensual: redondear2(computeMaintenanceMonthly(input.total).monthlyAmount), esSugerido: true };
}

// ============================================================
// Piezas del sistema
// ============================================================

export interface ModuloParaLinea {
  name: string;
  description?: string | null;
  type?: string | null;
  screensCount?: number | null;
  reportsCount?: number | null;
  catalogsCount?: number | null;
  integrationsCount?: number | null;
  sensitiveData?: boolean | null;
}

const TIPO_DE_PIEZA: Record<string, string> = {
  catalogo: "Catálogo",
  transaccional: "Registro de operaciones",
  reporte: "Reportes",
  integracion: "Conexión con otro sistema",
  flujo: "Flujo de trabajo",
};

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

/**
 * Una línea que dice qué es la pieza: la primera frase de su descripción, o, si
 * no tiene, su tipo con cuántas pantallas, reportes y conexiones lleva.
 */
export function lineaDeModulo(m: ModuloParaLinea): string {
  const descripcion = (m.description ?? "").replace(/\s+/g, " ").trim();
  if (descripcion) {
    const punto = descripcion.search(/[.!?](\s|$)/);
    const frase = punto >= 0 ? descripcion.slice(0, punto + 1) : descripcion;
    return frase.length > 160 ? `${frase.slice(0, 157).trimEnd()}...` : frase;
  }
  const partes: string[] = [];
  const pantallas = Number(m.screensCount) || 0;
  const reportes = Number(m.reportsCount) || 0;
  const catalogos = Number(m.catalogsCount) || 0;
  const conexiones = Number(m.integrationsCount) || 0;
  if (pantallas > 0) partes.push(plural(pantallas, "pantalla", "pantallas"));
  if (reportes > 0) partes.push(plural(reportes, "reporte", "reportes"));
  if (catalogos > 0) partes.push(plural(catalogos, "catálogo", "catálogos"));
  if (conexiones > 0) partes.push(plural(conexiones, "conexión con otro sistema", "conexiones con otros sistemas"));
  if (m.sensitiveData) partes.push("maneja datos personales");
  const tipo = (m.type && TIPO_DE_PIEZA[m.type]) || "Pieza del sistema";
  return partes.length > 0 ? `${tipo}: ${partes.join(", ")}.` : `${tipo}.`;
}

// ============================================================
// Cifras que se congelan al guardar
// ============================================================

export interface FilaDePrecioDeCambio {
  type: string;
  etiqueta: string;
  descripcion: string;
  /** Con IVA. */
  minConIva: number;
  maxConIva: number;
}

export interface LicenciasDelCliente {
  usuarios: number;
  usdPorUsuario: number;
  mensualMXN: number;
  /** true = el número de usuarios es un supuesto porque el proyecto no lo capturó. */
  supuestos: boolean;
  tipoCambio: number;
}

/**
 * Las cifras de la estimación, tal como estaban al guardar la cotización.
 * Volver a calcular la estimación no las mueve: la cotización que ya se
 * entregó no cambia sola. Nada de aquí es costo ni utilidad del desarrollador.
 */
export interface CifrasCongeladas {
  version: 1;
  congeladoEl: string;
  estimacion: {
    id: string;
    version: number;
    mode: string;
    scenario: string;
    /** Cuándo se calculó (de ahí salen los parámetros que se citan en los supuestos). */
    calculadaEl: string | null;
  };
  subtotal: number;
  iva: number;
  total: number;
  /** 0.16 */
  tasaIva: number;
  semanas: number;
  meses: number;
  modulos: { nombre: string; linea: string }[];
  precioDeCambios: FilaDePrecioDeCambio[];
  /** Solo en plataformas de armado: licencias por usuario final que paga el cliente. */
  licencias: LicenciasDelCliente | null;
}

/** Lo que se guarda en Cotizacion.snapshotJson: las cifras congeladas y lo que se derivó de ellas al guardar. */
export interface SnapshotDeCotizacion extends CifrasCongeladas {
  mantenimiento: MantenimientoDeCotizacion;
  pagos: PagoDeCotizacion[];
}

export interface EntradaDeCifras {
  estimacion: {
    id: string;
    version: number;
    mode: string;
    scenario: string;
    subtotal: number;
    vat: number;
    total: number;
    weeksTotal: number | null;
    /** Para la tarifa con la que se calculan los cambios. No se guarda en la cotización. */
    directCost: number;
    /** Idem. */
    margin: number;
    createdAt?: Date | string | null;
  };
  modulos: ModuloParaLinea[];
  /** El mismo factor de horas que usan los reportes (factorHorasCambio). 1 si no hay dato. */
  factorHorasCambios: number;
  licencias: LicenciasDelCliente | null;
  ahora: Date;
}

/** Horas por semana con las que el sistema pasa de costo semanal a costo por hora (igual que los reportes). */
const HORAS_POR_SEMANA = 40;

/**
 * Congela las cifras de una estimación para la cotización. El precio de cada
 * tipo de cambio sale del mismo cálculo que el reporte del proveedor (rangos
 * por tipo, llevados a precio con el margen y el IVA de la estimación), pero
 * lo único que sale de aquí son los precios con IVA: ni el costo, ni el margen
 * ni la tarifa semanal quedan guardados.
 */
export function congelarCifras(e: EntradaDeCifras): CifrasCongeladas {
  const est = e.estimacion;
  const subtotal = redondear2(Number(est.subtotal) || 0);
  const iva = redondear2(Number(est.vat) || 0);
  const total = redondear2(Number(est.total) || 0);
  const tasaIva = subtotal > 0 ? Math.round((iva / subtotal) * 10000) / 10000 : 0.16;
  const semanas = redondear2(Number(est.weeksTotal) || 0);
  const tarifaSemanal = semanas > 0 ? (Number(est.directCost) || 0) / semanas : 0;
  const rangos = computeChangeRangeByType(tarifaSemanal, HORAS_POR_SEMANA, e.factorHorasCambios);
  const precios = preciosDeCambioPorTipo(rangos, Number(est.margin) || 0, tasaIva);
  const creada = est.createdAt ? aFecha(est.createdAt) : null;
  return {
    version: 1,
    congeladoEl: e.ahora.toISOString(),
    estimacion: {
      id: est.id,
      version: est.version,
      mode: est.mode,
      scenario: est.scenario,
      calculadaEl: creada && !Number.isNaN(creada.getTime()) ? creada.toISOString() : null,
    },
    subtotal,
    iva,
    total,
    tasaIva,
    semanas,
    meses: redondear2(semanas / SEMANAS_POR_MES),
    modulos: e.modulos.map((m) => ({ nombre: m.name, linea: lineaDeModulo(m) })),
    precioDeCambios: precios.map((p) => ({
      type: p.type,
      etiqueta: p.etiqueta,
      descripcion: p.description,
      minConIva: redondear2(p.minPrecioConIva),
      maxConIva: redondear2(p.maxPrecioConIva),
    })),
    licencias: e.licencias,
  };
}

/** Las cifras congeladas más lo que se deriva de los campos (calendario de pagos y mantenimiento). */
export function completarSnapshot(
  cifras: CifrasCongeladas,
  campos: Pick<CamposDeCotizacion, "anticipoPct" | "finalPct" | "incluyeMantenimiento" | "mantenimientoMensual">,
): SnapshotDeCotizacion {
  return {
    ...cifras,
    mantenimiento: mantenimientoDeCotizacion({
      incluye: campos.incluyeMantenimiento,
      capturado: campos.mantenimientoMensual,
      total: cifras.total,
    }),
    pagos: calendarioDePagos({
      total: cifras.total,
      anticipoPct: campos.anticipoPct,
      finalPct: campos.finalPct,
      meses: cifras.meses,
    }),
  };
}

/** Las cifras congeladas de un snapshot, sin lo que se derivó de los campos (pagos y mantenimiento). */
export function soloCifras(s: SnapshotDeCotizacion): CifrasCongeladas {
  return {
    version: s.version,
    congeladoEl: s.congeladoEl,
    estimacion: s.estimacion,
    subtotal: s.subtotal,
    iva: s.iva,
    total: s.total,
    tasaIva: s.tasaIva,
    semanas: s.semanas,
    meses: s.meses,
    modulos: s.modulos,
    precioDeCambios: s.precioDeCambios,
    licencias: s.licencias ?? null,
  };
}

/**
 * Lee el snapshot guardado. Si el texto no es un snapshot válido (versión
 * distinta, JSON roto) devuelve null y quien llama vuelve a calcular.
 */
export function leerSnapshot(json: string | null | undefined): SnapshotDeCotizacion | null {
  if (!json) return null;
  try {
    const s = JSON.parse(json) as Partial<SnapshotDeCotizacion> | null;
    if (!s || s.version !== 1 || typeof s.total !== "number" || !s.estimacion || !Array.isArray(s.modulos) || !Array.isArray(s.precioDeCambios)) {
      return null;
    }
    return s as SnapshotDeCotizacion;
  } catch {
    return null;
  }
}

// ============================================================
// Campos de la cotización
// ============================================================

export interface CamposDeCotizacion {
  /** null mientras no se guarda por primera vez. */
  numero: string | null;
  /** ISO. */
  fecha: string;
  vigenciaDias: number;
  proveedorNombre: string;
  proveedorRfc: string | null;
  proveedorContacto: string | null;
  clienteNombre: string;
  mode: string;
  scenario: string;
  exclusiones: string[];
  supuestos: string[];
  incluyeMantenimiento: boolean;
  /** Con IVA incluido; null = el sugerido. */
  mantenimientoMensual: number | null;
  anticipoPct: number;
  finalPct: number;
  notas: string | null;
}

/** Un texto con un renglón por cosa, a lista: sin renglones vacíos ni viñetas escritas a mano. */
export function lineasDeTexto(texto: string): string[] {
  return texto
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*(?:[-*•]\s+)/, "").trim())
    .filter((l) => l.length > 0);
}

/** La lista a un texto con un renglón por cosa. */
export function textoDeLineas(lineas: readonly string[]): string {
  return lineas.join("\n");
}

/** Los tres supuestos con los que se arranca: parámetros con fecha, disponibilidad del cliente y forma de hacerlo. */
export function supuestosPorOmision(e: {
  clienteNombre: string;
  mode: string;
  scenario: string;
  /** Fecha de los parámetros con los que se calculó (la de la estimación). */
  fechaParametros: Date | string | null | undefined;
}): string[] {
  const cliente = e.clienteNombre.trim() || "El cliente";
  const fecha = e.fechaParametros ? fechaLarga(e.fechaParametros) : "";
  const modo = FRASE_DE_MODO[e.mode] ?? e.mode;
  const escenario = ESCENARIO_PARA_CLIENTE[e.scenario]?.nombre ?? e.scenario;
  return [
    fecha
      ? `Los precios se calcularon con los parámetros vigentes al ${fecha} (IVA, tipo de cambio y precio de las herramientas). Si cambian antes de firmar, el precio se confirma por escrito.`
      : "Los precios se calcularon con los parámetros vigentes a la fecha de esta cotización (IVA, tipo de cambio y precio de las herramientas). Si cambian antes de firmar, el precio se confirma por escrito.",
    `${cliente} responde las dudas y entrega a tiempo la información, los textos y los accesos que se le pidan; cada día de espera mueve la fecha de entrega.`,
    `El sistema se construye ${modo}. El precio y el plazo corresponden a esa forma de hacerlo y al escenario ${escenario}.`,
  ];
}

/** Los campos con los que arranca una cotización que todavía no se guarda. */
export function camposPorOmision(e: {
  proveedorNombre: string | null | undefined;
  clienteNombre: string;
  mode: string;
  scenario: string;
  fechaParametros: Date | string | null | undefined;
  ahora: Date;
}): CamposDeCotizacion {
  return {
    numero: null,
    fecha: e.ahora.toISOString(),
    vigenciaDias: VIGENCIA_POR_OMISION,
    proveedorNombre: (e.proveedorNombre ?? "").trim(),
    proveedorRfc: null,
    proveedorContacto: null,
    clienteNombre: e.clienteNombre.trim(),
    mode: e.mode,
    scenario: e.scenario,
    exclusiones: [...EXCLUSIONES_POR_OMISION],
    supuestos: supuestosPorOmision(e),
    incluyeMantenimiento: true,
    mantenimientoMensual: null,
    anticipoPct: ANTICIPO_POR_OMISION,
    finalPct: FINAL_POR_OMISION,
    notas: null,
  };
}

/** Frase de la forma de hacerlo y el escenario, en una sola línea. */
export function opcionEnUnaLinea(mode: string, scenario: string): string {
  const modo = FRASE_DE_MODO[mode] ?? mode;
  const esc = ESCENARIO_PARA_CLIENTE[scenario];
  return esc
    ? `Se construye ${modo}. Escenario ${esc.nombre}: ${esc.frase}.`
    : `Se construye ${modo}.`;
}

// ============================================================
// Lo que se recibe al guardar
// ============================================================

const textoOpcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo ${max} caracteres.`)
    .nullish()
    .transform((v) => (v ? v : null));

const lista = (nombre: string) =>
  z
    .array(z.string().trim().min(1).max(400, `Cada renglón de «${nombre}» admite hasta 400 caracteres.`))
    .max(30, `«${nombre}» admite hasta 30 renglones.`);

export const cotizacionGuardarSchema = z
  .object({
    vigenciaDias: z.number().int("Los días de vigencia deben ser un número entero.").min(1, "La vigencia es de al menos 1 día.").max(365, "La vigencia no puede pasar de 365 días."),
    proveedorNombre: z.string().trim().min(2, "Escribe tu nombre o el de tu empresa.").max(160),
    proveedorRfc: z
      .string()
      .trim()
      .toUpperCase()
      .nullish()
      .transform((v) => (v ? v : null))
      .refine((v) => v === null || /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/.test(v), "El RFC debe tener 12 o 13 caracteres, por ejemplo XAXX010101000."),
    proveedorContacto: textoOpcional(200),
    clienteNombre: z.string().trim().min(2, "Escribe el nombre de tu cliente.").max(200),
    mode: z.enum(MODOS),
    scenario: z.enum(ESCENARIOS),
    exclusiones: lista("Qué no incluye"),
    supuestos: lista("Supuestos"),
    incluyeMantenimiento: z.boolean(),
    mantenimientoMensual: z.number().min(0).max(100_000_000).nullish().transform((v) => (v ? v : null)),
    anticipoPct: z.number().int("El anticipo debe ser un número entero.").min(0, "El anticipo no puede ser negativo.").max(100, "El anticipo no puede pasar de 100 %."),
    finalPct: z.number().int("El pago final debe ser un número entero.").min(0, "El pago final no puede ser negativo.").max(100, "El pago final no puede pasar de 100 %."),
    notas: textoOpcional(2000),
    /** true = volver a leer las cifras de la estimación de hoy (y poner la fecha de hoy). */
    refrescarCifras: z.boolean().optional(),
  })
  .refine((d) => d.anticipoPct + d.finalPct <= 100, {
    message: "El anticipo y el pago final no pueden sumar más de 100 %.",
    path: ["finalPct"],
  });

export type CotizacionGuardar = z.infer<typeof cotizacionGuardarSchema>;

// ============================================================
// Lo que la API le da a la pantalla
// ============================================================

export interface OpcionDisponible {
  mode: string;
  scenario: string;
  /** Con IVA. */
  total: number;
  semanas: number | null;
}

/** Lo que devuelve GET /api/projects/[id]/cotizacion y lo que arma la pantalla de la cotización. */
export interface CotizacionPayload {
  /** true = ya hay una cotización guardada; false = son los campos con los que arrancaría. */
  guardada: boolean;
  /** false en el ejemplo compartido (solo lectura para quien no es administrador). */
  puedeEditar: boolean;
  /** true = el proyecto es el ejemplo compartido. */
  esEjemplo: boolean;
  /** true = el proyecto todavía no tiene una estimación calculada; no hay cifras. */
  sinEstimacion: boolean;
  proyecto: { id: string; nombre: string; objetivo: string | null; cliente: string };
  campos: CamposDeCotizacion;
  /** Las cifras de la opción elegida: las congeladas si ya se guardó, las de hoy si no. null si no hay estimación. */
  cifras: CifrasCongeladas | null;
  /** Las formas de hacerlo y escenarios que tienen estimación calculada. */
  opciones: OpcionDisponible[];
  /** Lo que recomienda el sistema para quien cotiza. */
  recomendada: { mode: string; scenario: string } | null;
  /** La opción que la persona eligió en la pantalla del proyecto, si ya eligió. */
  decision: { mode: string; scenario: string } | null;
  /** Hay una estimación más nueva de esta opción con otro precio que las cifras congeladas. */
  desactualizada: { totalGuardado: number; totalHoy: number } | null;
  /** Cambios ya aceptados contra el precio pactado (regla del 20 %). */
  acumulado: AcumuladoDeCambios | null;
}

// ============================================================
// El documento
// ============================================================

/** Todo lo que lleva el documento, ya resuelto. El componente solo lo dibuja. */
export interface DocumentoDeCotizacion {
  /** null = todavía sin guardar. */
  numero: string | null;
  fechaTexto: string;
  vigenciaDias: number;
  vigenciaHastaTexto: string;
  proveedor: { nombre: string; rfc: string | null; contacto: string | null };
  cliente: string;
  proyecto: { nombre: string; objetivo: string | null };
  opcion: { modo: string; escenario: string; linea: string };
  precio: { subtotal: number; iva: number; total: number; tasaIvaPct: number };
  tiempo: { semanas: number; meses: number };
  alcance: { nombre: string; linea: string }[];
  licencias: LicenciasDelCliente | null;
  exclusiones: string[];
  supuestos: string[];
  cambios: FilaDePrecioDeCambio[];
  mantenimiento: MantenimientoDeCotizacion & { cubre: string };
  pagos: PagoDeCotizacion[];
  condiciones: readonly string[];
  notas: string | null;
  /** Cambios ya aceptados sobre este proyecto, si hay. */
  acumulado: AcumuladoDeCambios | null;
}

/**
 * Arma el documento a partir de los campos que escribió la persona, las
 * cifras congeladas y los datos del proyecto. El calendario de pagos y el
 * mantenimiento se calculan de nuevo con los campos de hoy, para que la vista
 * previa del formulario siga lo que se escribe; al guardar quedan en el
 * snapshot los mismos valores.
 */
export function construirDocumento(e: {
  campos: CamposDeCotizacion;
  cifras: CifrasCongeladas;
  proyecto: { nombre: string; objetivo: string | null };
  acumulado?: AcumuladoDeCambios | null;
}): DocumentoDeCotizacion {
  const { campos, cifras } = e;
  const derivado = completarSnapshot(cifras, campos);
  const esc = ESCENARIO_PARA_CLIENTE[campos.scenario];
  const acumulado = e.acumulado && e.acumulado.aceptados > 0 ? e.acumulado : null;
  return {
    numero: campos.numero,
    fechaTexto: fechaLarga(campos.fecha),
    vigenciaDias: campos.vigenciaDias,
    vigenciaHastaTexto: fechaLarga(vigenciaHasta(campos.fecha, campos.vigenciaDias)),
    proveedor: { nombre: campos.proveedorNombre, rfc: campos.proveedorRfc, contacto: campos.proveedorContacto },
    cliente: campos.clienteNombre,
    proyecto: e.proyecto,
    opcion: {
      modo: FRASE_DE_MODO[campos.mode] ?? campos.mode,
      escenario: esc?.nombre ?? campos.scenario,
      linea: opcionEnUnaLinea(campos.mode, campos.scenario),
    },
    precio: { subtotal: cifras.subtotal, iva: cifras.iva, total: cifras.total, tasaIvaPct: Math.round(cifras.tasaIva * 10000) / 100 },
    tiempo: { semanas: cifras.semanas, meses: cifras.meses },
    alcance: cifras.modulos,
    licencias: cifras.licencias,
    exclusiones: campos.exclusiones,
    supuestos: campos.supuestos,
    cambios: cifras.precioDeCambios,
    mantenimiento: { ...derivado.mantenimiento, cubre: COBERTURA_DE_MANTENIMIENTO },
    pagos: derivado.pagos,
    condiciones: CONDICIONES_LEGALES,
    notas: campos.notas,
    acumulado,
  };
}

/** El documento de una carga; null si el proyecto todavía no tiene estimación. */
export function documentoDeCarga(carga: CotizacionPayload): DocumentoDeCotizacion | null {
  if (!carga.cifras) return null;
  return construirDocumento({
    campos: carga.campos,
    cifras: carga.cifras,
    proyecto: { nombre: carga.proyecto.nombre, objetivo: carga.proyecto.objetivo },
    acumulado: carga.acumulado,
  });
}
