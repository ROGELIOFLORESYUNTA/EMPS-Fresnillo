/**
 * POST /api/projects/[id]/changes/[changeId]/decision
 *   Aplica una decisión sobre la evaluación de impacto: approved / rejected /
 *   deferred / requires_clarification / scope_increase.
 *
 * Sustituye los 4 endpoints aproved/rejected/defer/clarify del addendum 30
 * con uno solo, parametrizado por status. Más simple de mantener y testear.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { changeImpactDecisionSchema } from "@/lib/validators";
import { getCurrentWorkspace, logWorkspaceActivity } from "@/lib/workspace";

const STATUS_TO_REQUEST_DECISION: Record<string, string> = {
  approved: "aceptado",
  rejected: "rechazado",
  deferred: "diferido",
  requires_clarification: "requires_clarification",
  scope_increase: "incluido", // se acepta pero como nuevo alcance facturado aparte
};

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; changeId: string }> }) {
  try {
    const { id, changeId } = await params;
    const body = await req.json();
    const data = changeImpactDecisionSchema.parse(body);

    const assessment = await prisma.changeImpactAssessment.findUnique({
      where: { changeRequestId: changeId },
    });
    if (!assessment) {
      return NextResponse.json(
        { error: "Este cambio aún no tiene evaluación de impacto. Calcula el impacto antes de decidir." },
        { status: 400 },
      );
    }

    // Regla de no absorción invisible (27_addendum_sds §9):
    // si requiresFormalApproval, no se puede marcar como "incluido sin costo" sin comentario.
    if (
      assessment.requiresFormalApproval &&
      data.status === "scope_increase" &&
      (!data.comment || data.comment.trim().length < 10)
    ) {
      return NextResponse.json(
        {
          error:
            "Este cambio requiere aprobación formal. Para marcarlo como nuevo alcance debes incluir un comentario explicando la autorización (≥10 caracteres).",
        },
        { status: 400 },
      );
    }

    const updatedAssessment = await prisma.changeImpactAssessment.update({
      where: { id: assessment.id },
      data: {
        decisionStatus: data.status,
        decisionComment: data.comment,
        decidedBy: data.decidedBy,
        decidedAt: new Date(),
      },
    });

    // Sincroniza el estado del ChangeRequest original
    const requestDecision = STATUS_TO_REQUEST_DECISION[data.status] ?? "pendiente";
    await prisma.changeRequest.update({
      where: { id: changeId, projectId: id },
      data: {
        decision: requestDecision,
        decidedBy: data.decidedBy,
        decidedAt: new Date(),
        isScopeIncrease: data.status === "scope_increase",
      },
    });

    await prisma.auditLog.create({
      data: {
        entity: "ChangeImpactAssessment",
        entityId: assessment.id,
        action: "decision",
        before: JSON.stringify({ decisionStatus: assessment.decisionStatus }),
        after: JSON.stringify({ decisionStatus: data.status, decidedBy: data.decidedBy }),
        context: data.comment ?? null,
      },
    });

    const workspace = await getCurrentWorkspace();
    if (workspace) {
      await logWorkspaceActivity(workspace.id, "change_decided", {
        projectId: id,
        changeRequestId: changeId,
        decision: data.status,
        decidedBy: data.decidedBy,
        scopeIncrease: data.status === "scope_increase",
      });
    }

    return NextResponse.json({ assessment: updatedAssessment });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "error" }, { status: 400 });
  }
}
