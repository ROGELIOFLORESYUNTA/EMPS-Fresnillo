/**
 * Cómo se le paga a una persona del equipo: por mes o por día.
 *
 * El motor siempre lee el sueldo MENSUAL (TeamProfile.monthlySalary). Si la
 * persona cotiza por día, el mensual sale de multiplicar por 30.4, la misma base
 * de días que usan la UMA mensual y el salario mínimo mensual (convención de
 * CONASAMI). Así lo que se compara contra el mínimo cuadra con el diario.
 *
 * Funciones puras: sin Prisma y sin Next.
 */

/** Días por mes para pasar del pago diario al mensual y al revés (el mismo 30.4 de cost.ts). */
export const FACTOR_DIAS_MES = 30.4;

/** Salario mínimo general diario 2026 (CONASAMI), por si la base de parámetros aún no lo trae. */
export const SALARIO_MINIMO_DIARIO_POR_OMISION = 315.04;

/** Lo que hace falta saber del pago de una persona. */
export interface PagoDePersona {
  /** "mensual" o "diario". Sin dato se toma como mensual. */
  payBasis?: string | null;
  monthlySalary?: number | null;
  dailyRate?: number | null;
}

const esNumero = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/** Redondea a centavos. */
export function redondear2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Sueldo mensual que lee el motor.
 *   diario: pago por día x 30.4
 *   mensual (o sin dato): el sueldo mensual capturado
 * Si dice "diario" pero no trae el pago por día, se usa el mensual capturado
 * para no devolver cero por un dato que falta.
 */
export function salarioMensualDesde(pago: PagoDePersona): number {
  if (pago.payBasis === "diario" && esNumero(pago.dailyRate)) return pago.dailyRate * FACTOR_DIAS_MES;
  return esNumero(pago.monthlySalary) ? pago.monthlySalary : 0;
}

/** Pago por día que corresponde a un sueldo mensual (mensual / 30.4). */
export function salarioDiarioDesde(mensual: number): number {
  return esNumero(mensual) ? mensual / FACTOR_DIAS_MES : 0;
}

/** Pesos con separador de miles y dos decimales, como se lee en México: 9,577.22 */
function pesos(n: number): string {
  return n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Aviso cuando el sueldo mensual queda abajo del salario mínimo general (el
 * diario por 30.4). Si no hay problema devuelve null. La comparación es a
 * centavos, para que 9,577.22 (el mínimo mensual publicado) no cuente como
 * "abajo".
 */
export function avisoSalarioMinimo(mensual: number, salarioMinimoDiario: number): string | null {
  if (!esNumero(mensual) || !esNumero(salarioMinimoDiario) || salarioMinimoDiario <= 0) return null;
  const minimoMensual = salarioMinimoDiario * FACTOR_DIAS_MES;
  if (redondear2(mensual) >= redondear2(minimoMensual)) return null;
  return `Queda abajo del salario mínimo general (${pesos(salarioMinimoDiario)} diarios, ${pesos(minimoMensual)} al mes).`;
}

/**
 * Para el servidor: si lo que captura la persona trae pago por día, le pone el
 * sueldo mensual (pago por día x 30.4, a centavos). Así el motor sigue leyendo
 * solo el mensual y la captura no tiene que mandarlo. Sin pago por día devuelve
 * el cuerpo tal cual.
 */
export function conMensualDelPagoDiario(cuerpo: unknown): unknown {
  if (typeof cuerpo !== "object" || cuerpo === null) return cuerpo;
  const c = cuerpo as Record<string, unknown>;
  if (c.payBasis !== "diario" || !esNumero(c.dailyRate) || c.dailyRate <= 0) return cuerpo;
  return { ...c, monthlySalary: redondear2(c.dailyRate * FACTOR_DIAS_MES) };
}
