/**
 * Lo que las rutas del equipo hacen igual al crear y al editar una persona.
 * Es el lado del servidor de pago.ts y equipo.ts (aquí sí se toca la base).
 */
import { prisma } from "./db";
import { loadSalarioMinimoDiario } from "./parameters";
import { SALARIO_MINIMO_DIARIO_POR_OMISION, avisoSalarioMinimo, salarioMensualDesde } from "./engine/pago";
import { cargaNominaDelEquipo, mesesDeSemanasAsignadas } from "./engine/equipo";

/**
 * Al editar, un cuerpo que cambia el pago por día (o la base de pago) se
 * completa con lo que la persona ya tenía guardado, para que el sueldo mensual
 * se recalcule aunque solo llegue el pago por día nuevo. Lo que viene en el
 * cuerpo manda sobre lo guardado.
 */
export async function conPagoGuardado(id: string, body: unknown): Promise<unknown> {
  if (typeof body !== "object" || body === null) return body;
  if (!("dailyRate" in body) && !("payBasis" in body)) return body;
  const guardado = await prisma.teamProfile.findUnique({ where: { id }, select: { payBasis: true, dailyRate: true } });
  if (!guardado) return body;
  return {
    payBasis: guardado.payBasis,
    dailyRate: guardado.dailyRate === null ? null : Number(guardado.dailyRate),
    ...body,
  };
}

/**
 * Con semanas asignadas, también se guarda monthsAssigned = semanas / 4.33 a
 * dos decimales: el reporte del proveedor todavía lee meses.
 */
export function conMesesDeLasSemanas<T extends { weeksAssigned?: number | null }>(data: T): T & { monthsAssigned?: number } {
  return data.weeksAssigned ? { ...data, monthsAssigned: mesesDeSemanasAsignadas(data.weeksAssigned) } : data;
}

/**
 * Aviso (o null) de que el sueldo mensual de la persona queda abajo del salario
 * mínimo general. Si la base de parámetros no responde se usa el de 2026.
 */
export async function avisoDeSalarioMinimo(perfil: {
  payBasis: string | null;
  monthlySalary: unknown;
  dailyRate: unknown;
}): Promise<string | null> {
  const salarioMinimo = await loadSalarioMinimoDiario().catch(() => SALARIO_MINIMO_DIARIO_POR_OMISION);
  const mensual = salarioMensualDesde({
    payBasis: perfil.payBasis,
    monthlySalary: Number(perfil.monthlySalary),
    dailyRate: perfil.dailyRate == null ? null : Number(perfil.dailyRate),
  });
  return avisoSalarioMinimo(mensual, salarioMinimo);
}

/**
 * Los avisos de salario mínimo de varias personas, cargando el mínimo una sola
 * vez. Devuelve solo las que quedan abajo: { idDeLaPersona: aviso }.
 */
export async function avisosDeSalarioMinimo(
  perfiles: { id: string; payBasis: string | null; monthlySalary: unknown; dailyRate: unknown }[],
): Promise<Record<string, string>> {
  if (perfiles.length === 0) return {};
  const salarioMinimo = await loadSalarioMinimoDiario().catch(() => SALARIO_MINIMO_DIARIO_POR_OMISION);
  const avisos: Record<string, string> = {};
  for (const p of perfiles) {
    const mensual = salarioMensualDesde({
      payBasis: p.payBasis,
      monthlySalary: Number(p.monthlySalary),
      dailyRate: p.dailyRate == null ? null : Number(p.dailyRate),
    });
    const aviso = avisoSalarioMinimo(mensual, salarioMinimo);
    if (aviso) avisos[p.id] = aviso;
  }
  return avisos;
}

/**
 * Solo una persona del proyecto es "yo" (la que cotiza y cobra su propio
 * tiempo): al marcar a una, las demás dejan de serlo.
 */
export async function soloUnDueno(projectId: string, profileId: string): Promise<void> {
  await prisma.teamProfile.updateMany({
    where: { projectId, isOwner: true, id: { not: profileId } },
    data: { isOwner: false },
  });
}

/**
 * Carga de nómina del equipo de un proyecto, para la calculadora de cambios
 * (computeChangeImpact, campo cargaNomina). Sin equipo capturado devuelve
 * undefined y la calculadora se queda con la de siempre (0.245).
 */
export async function cargaNominaDelProyecto(projectId: string): Promise<number | undefined> {
  const team = await prisma.teamProfile.findMany({
    where: { projectId },
    select: { monthlySalary: true, contractType: true, availabilityPercent: true },
  });
  if (team.length === 0) return undefined;
  return cargaNominaDelEquipo(
    team.map((p) => ({
      monthlySalary: Number(p.monthlySalary),
      contractType: p.contractType,
      availabilityPercent: Number(p.availabilityPercent),
    })),
  );
}
