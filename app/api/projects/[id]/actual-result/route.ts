import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Decimal } from "decimal.js";
import { z } from "zod";

const upsertSchema = z.object({
  estimateId: z.string().optional(),
  actualStartDate: z.string().datetime().optional(),
  actualEndDate: z.string().datetime().optional(),
  actualEffortHours: z.number().min(0).optional(),
  actualTotalCostMxn: z.number().min(0).optional(),
  actualChangeCount: z.number().int().min(0).optional(),
  actualMaintenanceCostMxn: z.number().min(0).optional(),
  wasCompleted: z.boolean().optional(),
  mainDeviationReason: z.string().optional(),
  lessonsLearned: z.string().optional(),
});

/**
 * Registra el resultado real del proyecto para retroalimentar el modelo.
 * Cumple addendum 25 (validacion cientifica) y addendum 21 (pipeline ML retroalimentacion).
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await prisma.projectActualResult.findFirst({
    where: { projectId: id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ result });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const data = upsertSchema.parse(body);

    const decFields = ["actualEffortHours", "actualTotalCostMxn", "actualMaintenanceCostMxn"] as const;
    const payload: Record<string, unknown> = {
      projectId: id,
      estimateId: data.estimateId ?? null,
      actualStartDate: data.actualStartDate ? new Date(data.actualStartDate) : null,
      actualEndDate: data.actualEndDate ? new Date(data.actualEndDate) : null,
      actualChangeCount: data.actualChangeCount ?? null,
      wasCompleted: data.wasCompleted ?? null,
      mainDeviationReason: data.mainDeviationReason ?? null,
      lessonsLearned: data.lessonsLearned ?? null,
    };
    for (const f of decFields) {
      if (data[f] !== undefined) payload[f] = new Decimal(data[f] as number);
    }

    const created = await prisma.projectActualResult.create({ data: payload as never });

    // Tambien crea TrainingCase derivado para alimentar ML
    const project = await prisma.project.findUnique({
      where: { id },
      include: { modules: true, estimates: { orderBy: { createdAt: "desc" }, take: 1 } },
    });
    if (project && project.estimates[0]) {
      const est = project.estimates[0];
      await prisma.trainingCase.create({
        data: {
          sourceKind: "local_capture",
          sourceRecordId: created.id,
          projectType: project.systemType,
          municipalArea: project.municipalArea,
          moduleCount: project.modules.length,
          userStoryCount: 0,
          devModeCode: est.mode,
          estimatedEffortHours: new Decimal(est.codingHours.toString()).plus(new Decimal(est.reviewHours.toString())).plus(new Decimal(est.testingHours.toString())),
          actualEffortHours: data.actualEffortHours !== undefined ? new Decimal(data.actualEffortHours) : null,
          estimatedCostMxn: new Decimal(est.subtotal.toString()),
          actualCostMxn: data.actualTotalCostMxn !== undefined ? new Decimal(data.actualTotalCostMxn) : null,
          changeCount: data.actualChangeCount,
          labelQuality: data.actualEffortHours !== undefined ? "strong" : "weak",
          notes: `Caso local generado desde ProjectActualResult ${created.id}`,
        },
      });
    }

    return NextResponse.json({ result: created }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "error" }, { status: 400 });
  }
}
