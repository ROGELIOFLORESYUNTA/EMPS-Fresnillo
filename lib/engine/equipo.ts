/**
 * El equipo del proyecto, persona por persona.
 *
 * Antes el costo del equipo era el de un mes por los meses del proyecto, como
 * si todos estuvieran de principio a fin. Aquí cada persona cuenta por los
 * meses que de verdad participa (semanas asignadas), tanto en el costo como en
 * la nómina de cada mes del flujo de efectivo. Sin semanas asignadas la persona
 * participa todo el proyecto y el resultado es el de siempre.
 *
 * Funciones puras: sin Prisma y sin Next.
 */
import { computeProfileCost } from "./cost";
import { redondear2 } from "./pago";
import type { FiscalRates } from "./types";

/** Semanas por mes con las que el sistema pasa de semanas a meses (el mismo 4.33 del calendario). */
export const SEMANAS_POR_MES = 4.33;

/**
 * Carga de nómina (IMSS + INFONAVIT) que la calculadora de cambios suma a la
 * mano de obra cuando el equipo está en nómina. La derivación está en
 * change-impact.ts.
 */
export const CARGA_NOMINA_POR_OMISION = 0.245;

/** Gastos administrativos que la calculadora de cambios suma a la mano de obra. */
export const CARGA_ADMIN_POR_OMISION = 0.10;

/** Lo que el motor necesita saber de cada persona. Los números ya vienen como number, no como Decimal. */
export interface PerfilDeEquipo {
  monthlySalary: number;
  contractType: string;
  /** De 0 a 100: qué parte de su tiempo dedica a este proyecto. */
  availabilityPercent: number;
  /** Semanas que participa en el proyecto. Sin dato (o 0) participa todo el proyecto. */
  weeksAssigned?: number | null;
}

/** Semanas asignadas llevadas a meses (semanas / 4.33), a dos decimales: es lo que se guarda en monthsAssigned. */
export function mesesDeSemanasAsignadas(semanas: number): number {
  return redondear2(semanas / SEMANAS_POR_MES);
}

/**
 * Meses que participa una persona en un proyecto de `realMonths` meses.
 *   con semanas asignadas: el menor entre los meses del proyecto y semanas / 4.33
 *   sin semanas asignadas: todo el proyecto
 * Unas semanas asignadas que no sean un número mayor que cero se toman como
 * "sin dato", para no borrar sin querer el costo de una persona.
 */
export function mesesDePersona(perfil: Pick<PerfilDeEquipo, "weeksAssigned">, realMonths: number): number {
  const semanas = perfil.weeksAssigned;
  if (semanas == null || !Number.isFinite(semanas) || semanas <= 0) return realMonths;
  return Math.min(realMonths, semanas / SEMANAS_POR_MES);
}

/**
 * Lo que cuesta una persona en un mes en que está presente, ya multiplicado por
 * la parte de su tiempo que dedica al proyecto. El tipo de contrato decide qué
 * cargas aplican (computeProfileCost).
 */
export function costoMensualDePersona(perfil: PerfilDeEquipo, rates: FiscalRates, useEstimated = false): number {
  const cost = computeProfileCost(
    {
      monthlySalary: perfil.monthlySalary,
      riskClass: "I",
      useEstimatedFactor: useEstimated,
      estimatedFactor: 0.40,
      contractType: perfil.contractType,
    },
    rates,
  );
  return (cost.total * perfil.availabilityPercent) / 100;
}

/** Lo que cuesta el equipo completo en un mes con todos presentes. */
export function costoMensualDelEquipo(team: PerfilDeEquipo[], rates: FiscalRates, useEstimated = false): number {
  return team.reduce((acc, p) => acc + costoMensualDePersona(p, rates, useEstimated), 0);
}

/**
 * Lo que cuesta el equipo en todo el proyecto: la suma, persona por persona, de
 * su costo mensual por los meses que participa.
 *
 *     costo = Σ costoMensual(persona) x meses(persona)
 */
export function costoDelEquipo(
  team: PerfilDeEquipo[],
  rates: FiscalRates,
  opts: { realMonths: number; useEstimated?: boolean },
): number {
  return team.reduce(
    (acc, p) => acc + costoMensualDePersona(p, rates, opts.useEstimated) * mesesDePersona(p, opts.realMonths),
    0,
  );
}

/**
 * Lo que se paga al equipo en cada mes del proyecto (mes 1 en la posición 0).
 *
 * Los meses van enteros (hacia arriba) y el último se prorratea. En el mes m,
 * cada persona aporta su costo mensual por la parte del mes en que sigue en el
 * proyecto: un mes completo mientras le falten más de un mes, la fracción que
 * le quede en su último mes y nada después. Quien sale a las 8 semanas (1.85
 * meses) paga completo el mes 1, 0.85 del mes 2 y nada del mes 3 en adelante.
 *
 * La suma de todos los meses es exactamente costoDelEquipo.
 */
export function nominaPorMes(
  team: PerfilDeEquipo[],
  rates: FiscalRates,
  opts: { realMonths: number; useEstimated?: boolean },
): number[] {
  const totalMeses = Math.max(1, Math.ceil(opts.realMonths));
  const personas = team.map((p) => ({
    mensual: costoMensualDePersona(p, rates, opts.useEstimated),
    meses: mesesDePersona(p, opts.realMonths),
  }));
  return Array.from({ length: totalMeses }, (_, i) =>
    personas.reduce((acc, p) => acc + p.mensual * Math.min(1, Math.max(0, p.meses - i)), 0),
  );
}

/**
 * Carga de nómina para la calculadora de cambios: 0.245 por la parte de la
 * nómina mensual que de verdad es nómina. Un equipo solo "propio" (o solo
 * honorarios) no paga IMSS, y la calculadora no debe sumárselo al cambio.
 *
 * La parte se saca del sueldo por la disponibilidad de cada persona (sin dato
 * de disponibilidad, todo su tiempo). Si todos ganan cero se reparte por número
 * de personas, y sin equipo se queda la carga por omisión.
 */
export function cargaNominaDelEquipo(
  team: { monthlySalary: number; contractType: string; availabilityPercent?: number | null }[],
): number {
  if (team.length === 0) return CARGA_NOMINA_POR_OMISION;
  const disponibilidad = (p: (typeof team)[number]) =>
    typeof p.availabilityPercent === "number" && Number.isFinite(p.availabilityPercent)
      ? Math.max(0, p.availabilityPercent)
      : 100;
  const pesos = (p: (typeof team)[number]) =>
    (Math.max(0, Number(p.monthlySalary) || 0) * disponibilidad(p)) / 100;
  const total = team.reduce((acc, p) => acc + pesos(p), 0);
  const enNomina = team.filter((p) => p.contractType === "nomina");
  const parte =
    total > 0 ? enNomina.reduce((acc, p) => acc + pesos(p), 0) / total : enNomina.length / team.length;
  return CARGA_NOMINA_POR_OMISION * parte;
}
