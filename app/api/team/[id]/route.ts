import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { teamProfileCreateSchema } from "@/lib/validators";
import { getCurrentWorkspace, logWorkspaceActivity } from "@/lib/workspace";
import { cargarProyectoConAcceso } from "@/lib/acceso-proyecto";
import { conMensualDelPagoDiario } from "@/lib/engine/pago";
import { avisoDeSalarioMinimo, conMesesDeLasSemanas, conPagoGuardado, soloUnDueno } from "@/lib/equipo-server";

/**
 * El integrante solo se toca si existe y su proyecto se puede abrir (dueño y
 * lado). Si no, se contesta 404 igual que si no existiera.
 */
async function integranteAccesible(id: string): Promise<boolean> {
  const profile = await prisma.teamProfile.findUnique({ where: { id }, select: { projectId: true } });
  if (!profile) return false;
  const { project } = await cargarProyectoConAcceso(profile.projectId);
  return project !== null;
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!(await integranteAccesible(id))) return NextResponse.json({ error: "Integrante no encontrado." }, { status: 404 });
    const body = await conPagoGuardado(id, await req.json());
    // Pago por día: el mensual se calcula aquí (x 30.4). Semanas asignadas: también se guardan como meses.
    const data = conMesesDeLasSemanas(teamProfileCreateSchema.partial().parse(conMensualDelPagoDiario(body)));
    const profile = await prisma.teamProfile.update({ where: { id }, data });
    // Solo una persona es "yo": si esta lo es, las demás dejan de serlo.
    if (profile.isOwner) await soloUnDueno(profile.projectId, profile.id);
    // Registro para la cronología "qué se modificó después de decidir".
    const workspace = await getCurrentWorkspace();
    if (workspace) {
      await logWorkspaceActivity(workspace.id, "team_updated", {
        projectId: profile.projectId,
        teamProfileId: profile.id,
        name: profile.name,
      });
    }
    return NextResponse.json({ profile, avisoSalarioMinimo: await avisoDeSalarioMinimo(profile) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "error" }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await integranteAccesible(id))) return NextResponse.json({ error: "Integrante no encontrado." }, { status: 404 });
  await prisma.teamProfile.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
