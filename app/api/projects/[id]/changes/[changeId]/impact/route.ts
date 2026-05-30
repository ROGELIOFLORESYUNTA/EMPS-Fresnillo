/**
 * POST /api/projects/[id]/changes/[changeId]/impact
 *   Calcula el impacto de un cambio (motor v7) y lo persiste en
 *   ChangeImpactAssessment. Si ya existía, actualiza (PUT-like).
 *
 * GET  /api/projects/[id]/changes/[changeId]/impact
 *   Devuelve la última evaluación (con campos v7 parseados).
 *
 * v7: carga parámetros desde tabla Parameter via loadChangeImpactParameters
 *     (en lugar de usar constantes hardcoded). Persiste 11 campos nuevos:
 *     plain/technical explanations, financialBreakdown, legalReferences,
 *     maintenanceImpactMonthly, minimumChargeApplied, freeChangeGuardrailReason,
 *     baselineBeforeVersion/After, sourceParameterKeysJson, lastParameterReviewAt.
 */
import { NextRequest, NextResponse } from "next/server";
import { Decimal } from "decimal.js";
import { prisma } from "@/lib/db";
import { changeImpactInputSchema } from "@/lib/validators";
import { computeChangeImpact } from "@/lib/engine";
import { loadChangeImpactParameters } from "@/lib/parameters";

const dec = (v: number | string) => new Decimal(v);

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; changeId: string }> }) {
  try {
    const { id, changeId } = await params;
    const body = await req.json();
    const input = changeImpactInputSchema.parse(body);

    const change = await prisma.changeRequest.findFirst({ where: { id: changeId, projectId: id } });
    if (!change) {
      return NextResponse.json({ error: "ChangeRequest no encontrado en este proyecto." }, { status: 404 });
    }

    // v7: cargar parámetros frescos desde DB
    const engineParams = await loadChangeImpactParameters(2026, "Zacatecas");

    const result = computeChangeImpact(
      { ...input, projectId: id, changeRequestId: changeId },
      engineParams,
    );

    const now = new Date();
    const data = {
      projectId: id,
      changeRequestId: changeId,
      originalText: input.originalText,
      suggestedType: result.suggestedType,
      currentPhase: input.currentPhase,
      developmentMode: input.developmentMode,
      clarityLevel: input.clarityLevel,
      urgencyLevel: input.urgencyLevel,
      affectedArtifactsJson: JSON.stringify(input.affectedArtifacts),
      artifactPoints: dec(result.breakdown.artifactPoints),
      clarityFactor: dec(result.breakdown.clarityFactor),
      phaseFactor: dec(result.breakdown.phaseFactor),
      modeFactor: dec(result.breakdown.modeFactorAdjusted),
      riskFactor: dec(result.breakdown.riskFactor),
      contingencyRate: dec(result.breakdown.contingencyRate),
      optimisticHours: dec(result.optimisticHours),
      probableHours: dec(result.probableHours),
      conservativeHours: dec(result.conservativeHours),
      estimatedCost: dec(result.costImpact),
      calendarImpactDays: result.calendarImpactDays,
      riskLevel: result.riskLevel,
      requiresNewBaseline: result.requiresNewBaseline,
      requiresFormalApproval: result.requiresFormalApproval,
      explanationJson: JSON.stringify(result.explanation),
      questionsToClarifyJson: JSON.stringify(result.questionsToClarify),
      parametersSnapshot: JSON.stringify({
        loadedKeys: engineParams.loadedKeys,
        fallbackWarnings: engineParams.fallbackWarnings,
        loadedAt: engineParams.loadedAt,
        engineVersion: "v7-2026-05-30",
      }),
      // === v7 nuevos campos ===
      clientPlainExplanationJson: JSON.stringify(result.plainExplanationForClient ?? []),
      providerTechnicalJson: JSON.stringify(result.technicalExplanationForProvider ?? []),
      financialBreakdownJson: JSON.stringify(result.financialBreakdown ?? {}),
      legalReferencesJson: JSON.stringify(result.legalReferences ?? []),
      maintenanceImpactMonthly: dec(result.maintenanceImpactMonthly ?? 0),
      minimumChargeApplied: result.minimumChargeApplied ?? false,
      freeChangeGuardrailReason: result.freeChangeGuardrailReason ?? null,
      sourceParameterKeysJson: JSON.stringify(result.parameterSourceKeys ?? []),
      lastParameterReviewAt: now,
    };

    const assessment = await prisma.changeImpactAssessment.upsert({
      where: { changeRequestId: changeId },
      create: data,
      update: { ...data, decisionStatus: undefined },
    });

    await prisma.auditLog.create({
      data: {
        entity: "ChangeImpactAssessment",
        entityId: assessment.id,
        action: "compute",
        after: JSON.stringify({ result, breakdown: result.breakdown }),
        context: `Cambio ${changeId} en proyecto ${id}, fase ${input.currentPhase}, modo ${input.developmentMode} (motor v7)`,
      },
    });

    return NextResponse.json({ assessment, result }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "error" }, { status: 400 });
  }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string; changeId: string }> }) {
  const { changeId } = await params;
  const assessment = await prisma.changeImpactAssessment.findUnique({
    where: { changeRequestId: changeId },
  });
  if (!assessment) return NextResponse.json({ assessment: null });
  return NextResponse.json({
    assessment: {
      ...assessment,
      affectedArtifacts: JSON.parse(assessment.affectedArtifactsJson),
      explanation: JSON.parse(assessment.explanationJson),
      questionsToClarify: JSON.parse(assessment.questionsToClarifyJson),
      // v7 parsed
      plainExplanationForClient: assessment.clientPlainExplanationJson ? JSON.parse(assessment.clientPlainExplanationJson) : [],
      technicalExplanationForProvider: assessment.providerTechnicalJson ? JSON.parse(assessment.providerTechnicalJson) : [],
      financialBreakdown: assessment.financialBreakdownJson ? JSON.parse(assessment.financialBreakdownJson) : null,
      legalReferences: assessment.legalReferencesJson ? JSON.parse(assessment.legalReferencesJson) : [],
      parameterSourceKeys: assessment.sourceParameterKeysJson ? JSON.parse(assessment.sourceParameterKeysJson) : [],
    },
  });
}
