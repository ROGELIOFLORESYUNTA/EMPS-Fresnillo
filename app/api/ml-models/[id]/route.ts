import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const updateSchema = z.object({
  modelName: z.string().min(2).optional(),
  targetVariable: z.string().optional(),
  algorithm: z.enum(["linear_regression", "random_forest", "gradient_boosting", "xgboost", "neural_network", "rules_only"]).optional(),
  trainingDatasetNotes: z.string().nullable().optional(),
  modelArtifactPath: z.string().nullable().optional(),
  status: z.enum(["draft", "trained", "approved", "retired"]).optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const model = await prisma.mLModelRegistry.findUnique({
    where: { id },
    include: {
      metrics: { orderBy: { createdAt: "desc" } },
      _count: { select: { predictions: true } },
    },
  });
  if (!model) return NextResponse.json({ error: "Modelo no encontrado" }, { status: 404 });
  return NextResponse.json({ model });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const data = updateSchema.parse(body);
    const model = await prisma.mLModelRegistry.update({ where: { id }, data });
    await prisma.auditLog.create({
      data: { entity: "MLModelRegistry", entityId: id, action: "update", after: JSON.stringify(model) },
    });
    return NextResponse.json({ model });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "error" }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    // Soft delete: marcar como retirado
    const model = await prisma.mLModelRegistry.update({ where: { id }, data: { status: "retired" } });
    await prisma.auditLog.create({ data: { entity: "MLModelRegistry", entityId: id, action: "delete", context: "Modelo retirado" } });
    return NextResponse.json({ model, message: "Modelo marcado como retirado" });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "error" }, { status: 400 });
  }
}
