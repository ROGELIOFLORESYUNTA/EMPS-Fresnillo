/**
 * Decisión del proyecto: la opción (modo × escenario) que el usuario ELIGE.
 *
 * POST  /api/projects/[id]/decision  → registra la decisión con la foto de
 *       las cifras de hoy (total, semanas, riesgo, versión). La decisión
 *       anterior queda supersedida (histórico, nunca se borra). El proyecto
 *       pasa a status "aprobado" (sin degradar en_ejecucion/cerrado).
 * GET   /api/projects/[id]/decision  → lista (la activa = supersededAt null).
 *
 * Aislamiento: mismo criterio que la página del proyecto (404 si es de otro
 * workspace); las plantillas compartidas no aceptan decisiones.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { projectDecisionCreateSchema } from "@/lib/validators";
import { getCurrentWorkspace, getCurrentWorkspaceId, logWorkspaceActivity } from "@/lib/workspace";

async function loadProjectWithAccess(id: string) {
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) return { project: null, status: 404 as const };
  if (!project.isTemplate && project.workspaceId) {
    const myWorkspace = await getCurrentWorkspaceId();
    if (project.workspaceId !== myWorkspace) return { project: null, status: 404 as const };
  }
  return { project, status: 200 as const };
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { project, status } = await loadProjectWithAccess(id);
  if (!project) return NextResponse.json({ error: "Proyecto no encontrado." }, { status });
  const decisions = await prisma.projectDecision.findMany({
    where: { projectId: id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ decisions });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { project, status } = await loadProjectWithAccess(id);
    if (!project) return NextResponse.json({ error: "Proyecto no encontrado." }, { status });
    if (project.isTemplate) {
      return NextResponse.json(
        { error: "Este proyecto es una plantilla de ejemplo compartida. Crea tu propio proyecto para registrar decisiones." },
        { status: 400 },
      );
    }

    const body = await req.json();
    const data = projectDecisionCreateSchema.parse(body);

    // La estimación más reciente de esa combinación (la foto de hoy).
    const estimate = await prisma.estimate.findFirst({
      where: { projectId: id, mode: data.mode, scenario: data.scenario },
      orderBy: { version: "desc" },
    });
    if (!estimate) {
      return NextResponse.json(
        { error: "No hay una estimación calculada para esa combinación de modo y escenario. Corre la estimación primero." },
        { status: 400 },
      );
    }

    const followedRecommendation =
      data.recommendedMode && data.recommendedScenario
        ? data.mode === data.recommendedMode && data.scenario === data.recommendedScenario
        : null;

    const workspace = await getCurrentWorkspace();

    const decision = await prisma.$transaction(async (tx) => {
      await tx.projectDecision.updateMany({
        where: { projectId: id, supersededAt: null },
        data: { supersededAt: new Date() },
      });
      const created = await tx.projectDecision.create({
        data: {
          projectId: id,
          estimateId: estimate.id,
          mode: data.mode,
          scenario: data.scenario,
          versionAtDecision: estimate.version,
          totalAtDecision: estimate.total,
          weeksAtDecision: estimate.weeksTotal,
          riskLevelAtDecision: estimate.riskLevel,
          recommendedMode: data.recommendedMode ?? null,
          recommendedScenario: data.recommendedScenario ?? null,
          followedRecommendation,
          decidedByName: data.decidedByName || null,
          note: data.note || null,
          workspaceId: workspace?.id ?? null,
        },
      });
      // "aprobado" solo desde estados previos: no degradar un proyecto ya en marcha.
      if (["borrador", "captura", "estimado", "aprobado"].includes(project.status)) {
        await tx.project.update({ where: { id }, data: { status: "aprobado" } });
      }
      return created;
    });

    await prisma.auditLog.create({
      data: {
        entity: "ProjectDecision",
        entityId: decision.id,
        action: "create",
        after: JSON.stringify({
          mode: decision.mode,
          scenario: decision.scenario,
          version: decision.versionAtDecision,
          total: Number(decision.totalAtDecision),
          followedRecommendation,
        }),
        context: `Decisión de opción en proyecto ${id}`,
      },
    });

    if (workspace) {
      await logWorkspaceActivity(workspace.id, "option_chosen", {
        projectId: id,
        mode: data.mode,
        scenario: data.scenario,
        total: Number(estimate.total),
        version: estimate.version,
        followedRecommendation,
      });
    }

    return NextResponse.json({ decision }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "error" }, { status: 400 });
  }
}
