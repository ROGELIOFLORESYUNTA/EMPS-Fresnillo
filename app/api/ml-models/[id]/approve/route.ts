import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const approveSchema = z.object({
  approvedBy: z.string().min(2),
});

/**
 * Marca un modelo como aprobado para uso en producción del sistema.
 * Solo modelos aprobados deben usarse para sugerencias en la UI.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const data = approveSchema.parse(body);

    const model = await prisma.mLModelRegistry.update({
      where: { id },
      data: {
        status: "approved",
        approvedAt: new Date(),
        approvedBy: data.approvedBy,
      },
    });

    await prisma.auditLog.create({
      data: {
        entity: "MLModelRegistry",
        entityId: model.id,
        action: "approve",
        after: JSON.stringify({ modelKey: model.modelKey, status: model.status }),
        context: `Aprobado por ${data.approvedBy}`,
      },
    });

    return NextResponse.json({ model });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "error" }, { status: 400 });
  }
}
