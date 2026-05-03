/**
 * POST /api/projects/[id]/changes/[changeId]/impact
 *   Calcula el impacto de un cambio (motor change-impact) y lo persiste en
 *   ChangeImpactAssessment. Si ya existía, actualiza (PUT-like).
 *
 * GET  /api/projects/[id]/changes/[changeId]/impact
 *   Devuelve la última evaluación.
 *
 * Cumple addendum v6 (30_addendum_api_control_cambios.md). NO sobrescribe
 * ChangeRequest original — la evaluación es un modelo separado relacionado.
 */
import { NextRequest, NextResponse } from "next/server";
import { Decimal } from "decimal.js";
import { prisma } from "@/lib/db";
import { changeImpactInputSchema } from "@/lib/validators";
import {
  computeChangeImpact,
  ARTIFACT_WEIGHTS,
  CHANGE_CLARITY_FACTOR,
  CHANGE_PHASE_FACTOR,
  CHANGE_MODE_FACTOR,
  CHANGE_CONTINGENCY_BY_TYPE,
  HIGH_RISK_MODE_FLOOR,
} from "@/lib/engine";

const dec = (v: number | string) => new Decimal(v);

function snapshotParameters() {
  return {
    ARTIFACT_WEIGHTS,
    CLARITY_FACTOR: CHANGE_CLARITY_FACTOR,
    PHASE_FACTOR: CHANGE_PHASE_FACTOR,
    MODE_FACTOR: CHANGE_MODE_FACTOR,
    CONTINGENCY_BY_TYPE: CHANGE_CONTINGENCY_BY_TYPE,
    HIGH_RISK_MODE_FLOOR,
    snapshotAt: new Date().toISOString(),
    engineVersion: "v6-2026-05-03",
  };
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; changeId: string }> }) {
  try {
    const { id, changeId } = await params;
    const body = await req.json();
    const input = changeImpactInputSchema.parse(body);

    const change = await prisma.changeRequest.findFirst({ where: { id: changeId, projectId: id } });
    if (!change) {
      return NextResponse.json({ error: "ChangeRequest no encontrado en este proyecto." }, { status: 404 });
    }

    const result = computeChangeImpact({
      ...input,
      projectId: id,
      changeRequestId: changeId,
    });

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
      parametersSnapshot: JSON.stringify(snapshotParameters()),
    };

    const assessment = await prisma.changeImpactAssessment.upsert({
      where: { changeRequestId: changeId },
      create: data,
      update: { ...data, decisionStatus: undefined }, // no toca la decisión existente
    });

    await prisma.auditLog.create({
      data: {
        entity: "ChangeImpactAssessment",
        entityId: assessment.id,
        action: "compute",
        after: JSON.stringify({ result, breakdown: result.breakdown }),
        context: `Cambio ${changeId} en proyecto ${id} — fase ${input.currentPhase} · modo ${input.developmentMode}`,
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
    },
  });
}
