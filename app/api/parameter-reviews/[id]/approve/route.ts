import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const approveSchema = z.object({
  approvedBy: z.string().min(2),
  validFrom: z.string().datetime().optional(),
  validTo: z.string().datetime().optional(),
  notes: z.string().optional(),
});

/**
 * Aprueba un cambio detectado. Crea una nueva FiscalParameterVersion
 * con valor nuevo, fecha de vigencia y supersede la anterior.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const data = approveSchema.parse(body);

    const review = await prisma.parameterChangeReview.findUnique({ where: { id } });
    if (!review) return NextResponse.json({ error: "no encontrado" }, { status: 404 });

    const validFrom = data.validFrom ? new Date(data.validFrom) : new Date();

    // Supersede previous active version
    await prisma.fiscalParameterVersion.updateMany({
      where: { parameterKey: review.parameterKey, approvalStatus: "approved", validTo: null },
      data: { validTo: validFrom, approvalStatus: "superseded" },
    });

    const newVersion = await prisma.fiscalParameterVersion.create({
      data: {
        parameterKey: review.parameterKey,
        parameterName: review.parameterKey,
        valueText: review.newValue,
        valueNumeric: review.newValue && !Number.isNaN(Number.parseFloat(review.newValue)) ? Number.parseFloat(review.newValue).toString() : null,
        unit: "rate",
        sourceSnapshotId: review.sourceSnapshotId,
        approvalStatus: "approved",
        approvedBy: data.approvedBy,
        approvedAt: new Date(),
        validFrom,
        validTo: data.validTo ? new Date(data.validTo) : null,
        notes: data.notes ?? null,
      },
    });

    await prisma.parameterChangeReview.update({
      where: { id },
      data: {
        decision: "accepted",
        decidedBy: data.approvedBy,
        decidedAt: new Date(),
      },
    });

    await prisma.auditLog.create({
      data: {
        entity: "FiscalParameterVersion",
        entityId: newVersion.id,
        action: "approve",
        after: JSON.stringify(newVersion),
        context: `Aprobado por ${data.approvedBy} para parametro ${review.parameterKey}`,
      },
    });

    return NextResponse.json({ version: newVersion });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "error" }, { status: 400 });
  }
}
