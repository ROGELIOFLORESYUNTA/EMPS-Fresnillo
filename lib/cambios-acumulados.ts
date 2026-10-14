/**
 * Regla del 20 por ciento: hasta dónde llegan los cambios antes de ser otro
 * desarrollo.
 *
 * Cada cambio aceptado suma. Cuando lo acumulado pasa del 20 % del precio
 * pactado, ya no son "ajustes": es otro desarrollo y se cotiza aparte. La
 * referencia legal para clientes públicos es el art. 74 de la Ley de
 * Adquisiciones, Arrendamientos y Servicios del Sector Público (LAASSP), que
 * pone ese mismo tope a las modificaciones de un contrato.
 *
 * Todo va SIN IVA contra SIN IVA (el subtotal de la estimación contra el monto
 * de cada cambio antes de impuestos): la proporción es la misma que con IVA y
 * así no se mezclan bases.
 *
 * Funciones puras: sin Prisma y sin Next. El servidor junta los datos en
 * lib/cotizacion-server.ts.
 */

/** Tope de lo acumulado, como proporción del precio pactado. */
export const LIMITE_DE_CAMBIOS = 0.2;

/** Lo mismo, en por ciento, para mostrarlo. */
export const LIMITE_DE_CAMBIOS_PCT = 20;

/** La línea que se muestra cuando lo acumulado pasa del tope. */
export const AVISO_VEINTE_POR_CIENTO =
  "Los cambios ya suman más del 20 % del precio pactado: esto es otro desarrollo, cotízalo aparte";

/** Referencia para quien le cotiza a una dependencia pública. */
export const REFERENCIA_LAASSP =
  "Referencia para clientes públicos: Ley de Adquisiciones, Arrendamientos y Servicios del Sector Público (LAASSP), art. 74.";

/** Decisiones de un cambio que cuentan como aceptadas. */
export const DECISIONES_ACEPTADAS: readonly string[] = ["aceptado", "incluido"];

export function esCambioAceptado(decision: string | null | undefined): boolean {
  return !!decision && DECISIONES_ACEPTADAS.includes(decision);
}

const esNumero = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/**
 * Lo que vale un cambio, antes de IVA. Si el cambio ya se evaluó con la
 * calculadora de impacto, manda el subtotal de esa evaluación (mano de obra con
 * cargas y reserva para imprevistos), que es el número más completo. Si no, el
 * costo que se capturó a mano, y como último recurso el costo solo de mano de
 * obra de la evaluación. Lo que no sea un número mayor que cero cuenta como
 * "sin dato" y vale cero.
 */
export function montoDeCambio(c: {
  /** Costo capturado a mano en la pantalla de cambios. */
  costImpact?: number | null;
  /** Subtotal antes de IVA de la evaluación de impacto (financialBreakdown.subtotalBeforeVat). */
  subtotalEvaluado?: number | null;
  /** Costo de mano de obra de la evaluación (assessment.estimatedCost). */
  costoEvaluado?: number | null;
}): number {
  for (const v of [c.subtotalEvaluado, c.costImpact, c.costoEvaluado]) {
    if (esNumero(v) && v > 0) return v;
  }
  return 0;
}

export interface AcumuladoDeCambios {
  /** El precio pactado contra el que se compara (sin IVA). */
  precioPactado: number;
  /** Cuántos cambios aceptados cuentan. */
  aceptados: number;
  /** Suma de lo aceptado (sin IVA). */
  monto: number;
  /** Lo acumulado como por ciento del precio, a un decimal. */
  porcentaje: number;
  /** true si pasa del 20 %. Exactamente 20 % todavía no es pasar. */
  excede: boolean;
  /** El tope, en por ciento. */
  limitePct: number;
}

export interface CambioParaAcumular {
  decision: string | null | undefined;
  /** Lo que vale el cambio, ver montoDeCambio. */
  monto: number | null | undefined;
}

/**
 * Acumula lo que valen los cambios aceptados y lo compara con el precio
 * pactado. Sin precio pactado (cero o raro) no hay contra qué comparar: el
 * porcentaje es 0 y no se avisa.
 */
export function acumuladoDeCambios(cambios: CambioParaAcumular[], precioPactado: number): AcumuladoDeCambios {
  const precio = esNumero(precioPactado) && precioPactado > 0 ? precioPactado : 0;
  const aceptados = cambios.filter((c) => esCambioAceptado(c.decision));
  const monto = aceptados.reduce((acc, c) => acc + (esNumero(c.monto) && c.monto > 0 ? c.monto : 0), 0);
  const proporcion = precio > 0 ? monto / precio : 0;
  return {
    precioPactado: precio,
    aceptados: aceptados.length,
    monto: Math.round(monto * 100) / 100,
    porcentaje: Math.round(proporcion * 1000) / 10,
    // El margen de 1e-9 evita que el ruido de los decimales (0.1 + 0.1) marque
    // como "pasado" un cambio que suma justo 20 %.
    excede: precio > 0 && proporcion > LIMITE_DE_CAMBIOS + 1e-9,
    limitePct: LIMITE_DE_CAMBIOS_PCT,
  };
}
