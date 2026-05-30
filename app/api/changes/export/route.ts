/**
 * GET /api/changes/export?format=json|csv&projectId=&changeId=
 *
 * v7: descarga masiva de evidencia de cambios para el artículo académico.
 * Incluye change request + assessment + parámetros usados + decisión.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { serializeChangesToCsv, serializeChangesToJson, type ChangeExportRow } from "@/lib/engine/change-export";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const format = url.searchParams.get("format") ?? "json";
  const projectId = url.searchParams.get("projectId") ?? undefined;
  const changeId = url.searchParams.get("changeId") ?? undefined;

  if (format !== "json" && format !== "csv") {
    return NextResponse.json({ error: "format debe ser 'json' o 'csv'" }, { status: 400 });
  }

  const where: { projectId?: string; id?: string } = {};
  if (projectId) where.projectId = projectId;
  if (changeId) where.id = changeId;

  const changes = await prisma.changeRequest.findMany({
    where,
    include: {
      project: true,
      assessment: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const exportedAt = new Date().toISOString();
  const rows: ChangeExportRow[] = changes.map((c) => ({
    projectId: c.projectId,
    projectName: c.project.name,
    projectClient: c.project.client,
    changeRequestId: c.id,
    originalText: c.clientOriginalText ?? c.description,
    requesterName: c.requesterName,
    changeType: c.type,
    changeDecision: c.decision,
    changeDecidedBy: c.decidedBy,
    changeDecidedAt: c.decidedAt ? c.decidedAt.toISOString() : null,
    assessmentId: c.assessment?.id ?? null,
    assessmentSuggestedType: c.assessment?.suggestedType ?? null,
    assessmentFinalType: c.assessment?.finalType ?? null,
    assessmentCurrentPhase: c.assessment?.currentPhase ?? null,
    assessmentDevelopmentMode: c.assessment?.developmentMode ?? null,
    assessmentClarityLevel: c.assessment?.clarityLevel ?? null,
    assessmentUrgencyLevel: c.assessment?.urgencyLevel ?? null,
    assessmentArtifactPoints: c.assessment?.artifactPoints ? Number(c.assessment.artifactPoints) : null,
    assessmentClarityFactor: c.assessment?.clarityFactor ? Number(c.assessment.clarityFactor) : null,
    assessmentPhaseFactor: c.assessment?.phaseFactor ? Number(c.assessment.phaseFactor) : null,
    assessmentModeFactor: c.assessment?.modeFactor ? Number(c.assessment.modeFactor) : null,
    assessmentRiskFactor: c.assessment?.riskFactor ? Number(c.assessment.riskFactor) : null,
    assessmentContingencyRate: c.assessment?.contingencyRate ? Number(c.assessment.contingencyRate) : null,
    assessmentProbableHours: c.assessment?.probableHours ? Number(c.assessment.probableHours) : null,
    assessmentOptimisticHours: c.assessment?.optimisticHours ? Number(c.assessment.optimisticHours) : null,
    assessmentConservativeHours: c.assessment?.conservativeHours ? Number(c.assessment.conservativeHours) : null,
    assessmentEstimatedCost: c.assessment?.estimatedCost ? Number(c.assessment.estimatedCost) : null,
    assessmentCalendarImpactDays: c.assessment?.calendarImpactDays ?? null,
    assessmentRiskLevel: c.assessment?.riskLevel ?? null,
    assessmentRequiresNewBaseline: c.assessment?.requiresNewBaseline ?? null,
    assessmentRequiresFormalApproval: c.assessment?.requiresFormalApproval ?? null,
    assessmentMaintenanceImpactMonthly: c.assessment?.maintenanceImpactMonthly ? Number(c.assessment.maintenanceImpactMonthly) : null,
    assessmentMinimumChargeApplied: c.assessment?.minimumChargeApplied ?? null,
    assessmentFreeChangeGuardrailReason: c.assessment?.freeChangeGuardrailReason ?? null,
    assessmentBaselineBeforeVersion: c.assessment?.baselineBeforeVersion ?? null,
    assessmentBaselineAfterVersion: c.assessment?.baselineAfterVersion ?? null,
    assessmentSourceParameterKeys: c.assessment?.sourceParameterKeysJson ?? "[]",
    assessmentLastParameterReviewAt: c.assessment?.lastParameterReviewAt ? c.assessment.lastParameterReviewAt.toISOString() : null,
    assessmentCreatedAt: c.assessment?.createdAt ? c.assessment.createdAt.toISOString() : null,
    exportedAt,
  }));

  const dateLabel = exportedAt.slice(0, 10);
  const filename = `evidencia-cambios-${dateLabel}.${format}`;

  if (format === "csv") {
    const csv = serializeChangesToCsv(rows);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }

  const json = serializeChangesToJson(rows, exportedAt);
  return new NextResponse(json, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
