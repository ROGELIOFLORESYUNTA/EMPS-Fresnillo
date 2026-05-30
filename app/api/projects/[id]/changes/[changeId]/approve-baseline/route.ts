/**
 * POST /api/projects/[id]/changes/[changeId]/approve-baseline
 *
 * v7: aprueba la creación de una nueva línea base del proyecto cuando un cambio
 * es estructural o de nuevo alcance. Actualiza ChangeImpactAssessment
 * (baselineBeforeVersion / baselineAfterVersion) y ChangeRequest (baselineVersion).
 *
 * Cumple addendum v7: gobierno de cambios estructurales con audit trail.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { approveBaselineSchema } from "@/lib/validators";
import { getCurrentWorkspace, logWorkspaceActivity } from "@/lib/workspace";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; changeId: string }> },
) {
  try {
    const { id, changeId } = await params;
    const body = await req.json();
    const data = approveBaselineSchema.parse(body);

    const assessment = await prisma.changeImpactAssessment.findUnique({
      where: { changeRequestId: changeId },
    });
    if (!assessment) {
      return NextResponse.json(
        { error: "Este cambio aún no tiene evaluación de impacto. Calcula el impacto antes de aprobar línea base." },
        { status: 400 },
      );
    }

    if (!assessment.requiresNewBaseline) {
      return NextResponse.json(
        { error: "Este cambio no requiere nueva línea base según el motor. Si es necesario, marca el cambio como estructural primero." },
        { status: 400 },
      );
    }

    const change = await prisma.changeRequest.findFirst({ where: { id: changeId, projectId: id } });
    if (!change) {
      return NextResponse.json({ error: "ChangeRequest no encontrado." }, { status: 404 });
    }

    const beforeVersion = change.baselineVersion ?? 1;
    const now = new Date();

    const updatedAssessment = await prisma.changeImpactAssessment.update({
      where: { id: assessment.id },
      data: {
        baselineBeforeVersion: beforeVersion,
        baselineAfterVersion: data.newBaselineVersion,
      },
    });

    await prisma.changeRequest.update({
      where: { id: changeId, projectId: id },
      data: {
        baselineVersion: data.newBaselineVersion,
        approvedBy: data.approvedBy,
        approvalDate: now,
      },
    });

    await prisma.auditLog.create({
      data: {
        entity: "ChangeImpactAssessment",
        entityId: assessment.id,
        action: "approve-baseline",
        before: JSON.stringify({ baselineVersion: beforeVersion }),
        after: JSON.stringify({ baselineVersion: data.newBaselineVersion, approvedBy: data.approvedBy }),
        context: data.comment,
      },
    });

    const workspace = await getCurrentWorkspace();
    if (workspace) {
      await logWorkspaceActivity(workspace.id, "baseline_approved", {
        projectId: id,
        changeRequestId: changeId,
        baselineBefore: beforeVersion,
        baselineAfter: data.newBaselineVersion,
        approvedBy: data.approvedBy,
      });
    }

    return NextResponse.json({ assessment: updatedAssessment, baselineBefore: beforeVersion, baselineAfter: data.newBaselineVersion });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "error" }, { status: 400 });
  }
}
