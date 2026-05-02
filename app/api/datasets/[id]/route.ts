import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  sourceType: z.enum(["zenodo", "csv", "local_capture", "github", "kaggle"]).optional(),
  sourceUrl: z.string().url().nullable().optional(),
  doi: z.string().nullable().optional(),
  license: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  intendedUse: z.string().nullable().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const dataset = await prisma.estimationDatasetSource.findUnique({
    where: { id },
    include: { imports: { orderBy: { importedAt: "desc" } } },
  });
  if (!dataset) return NextResponse.json({ error: "Dataset no encontrado" }, { status: 404 });
  return NextResponse.json({ dataset });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const data = updateSchema.parse(body);
    const dataset = await prisma.estimationDatasetSource.update({ where: { id }, data });
    await prisma.auditLog.create({
      data: { entity: "EstimationDatasetSource", entityId: id, action: "update", after: JSON.stringify(dataset) },
    });
    return NextResponse.json({ dataset });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "error" }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.estimationDatasetSource.delete({ where: { id } });
    await prisma.auditLog.create({ data: { entity: "EstimationDatasetSource", entityId: id, action: "delete" } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "error" }, { status: 400 });
  }
}
