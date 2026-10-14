/**
 * GET /api/projects/[id]/herramientas: lo que costarían al mes las herramientas
 * de IA de este equipo en cada forma de hacerlo, y cuánto del ahorro nominal
 * se acredita por su pericia con la IA. Mismas funciones y mismos parámetros
 * (con override del workspace) que usa el motor al estimar, para que la
 * pantalla de Calcular enseñe el número que después va a salir.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentWorkspaceId } from "@/lib/workspace";
import { cargarProyectoConAcceso } from "@/lib/acceso-proyecto";
import { loadAllForEstimate } from "@/lib/parameters";
import { MODOS } from "@/lib/engine/aptitud";
import { asientosDeHerramienta, periciaDelEquipo, ajustarPorPericia, costoHerramientasPorModo, NIVELES_HERRAMIENTA } from "@/lib/engine/herramientas";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const acceso = await cargarProyectoConAcceso(id);
  if (!acceso.project) return NextResponse.json({ error: "No encontrado." }, { status: acceso.status });
  const project = await prisma.project.findUnique({
    where: { id },
    select: { id: true, expectedUsers: true, targetDate: true, team: true },
  });
  if (!project) return NextResponse.json({ error: "No encontrado." }, { status: 404 });
  const workspaceId = await getCurrentWorkspaceId();

  const ctx = await loadAllForEstimate(project.targetDate?.getFullYear() ?? 2026, workspaceId);
  const asientos = asientosDeHerramienta(project.team);
  const pericia = periciaDelEquipo(project.team);

  const porModo: Record<string, unknown> = {};
  for (const mode of MODOS) {
    const h = costoHerramientasPorModo({ mode, team: project.team, nivel: "tipico", tabla: ctx.aiToolCosts, tipoCambio: ctx.tipoCambio, usuariosFinales: project.expectedUsers ?? null });
    const a = ajustarPorPericia(ctx.velocity[mode], mode, pericia.promedio, ctx.aiSkillFactors);
    const niveles: Record<string, { usd: number; mensualMXN: number }> = {};
    for (const nivel of NIVELES_HERRAMIENTA) {
      const hn = costoHerramientasPorModo({ mode, team: project.team, nivel, tabla: ctx.aiToolCosts, tipoCambio: ctx.tipoCambio, usuariosFinales: project.expectedUsers ?? null });
      niveles[nivel] = { usd: hn.usdPorAsiento, mensualMXN: hn.mensualMXN };
    }
    porModo[mode] = {
      mensualMXN: h.mensualMXN,
      usdPorAsiento: h.usdPorAsiento,
      niveles,
      asientosConPlanPropio: h.asientosConPlanPropio,
      sobreconsumo: h.sobreconsumo,
      descripcion: h.descripcion,
      usuariosFinales: h.usuariosFinales,
      usuariosFinalesSupuestos: h.usuariosFinalesSupuestos,
      mensualUsuariosFinalesMXN: h.mensualUsuariosFinalesMXN,
      factor: a.factor,
      aplica: a.aplica,
      eficienciaEfectiva: a.effort_efficiency,
      eficienciaNominal: a.nominal.effort_efficiency,
      velocidadEfectiva: a.velocity_factor,
      velocidadNominal: a.nominal.velocity_factor,
    };
  }

  return NextResponse.json({
    asientos,
    pericia: { promedio: pericia.promedio, conDato: pericia.conDato },
    tipoCambio: ctx.tipoCambio,
    aumentoAnual: ctx.aiToolAumentoAnual,
    porModo,
  });
}
