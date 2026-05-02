import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const updateSchema = z.object({
  value: z.string().nullable().optional(),
  unit: z.string().min(1).optional(),
  base: z.string().nullable().optional(),
  source: z.string().min(2).optional(),
  sourceUrl: z.string().url().nullable().optional(),
  effectiveFrom: z.string().datetime().optional(),
  effectiveUntil: z.string().datetime().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parameter = await prisma.parameter.findUnique({ where: { id } });
  if (!parameter) return NextResponse.json({ error: "Parámetro no encontrado" }, { status: 404 });
  return NextResponse.json({ parameter });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const data = updateSchema.parse(body);

    const before = await prisma.parameter.findUnique({ where: { id } });
    if (!before) return NextResponse.json({ error: "Parámetro no encontrado" }, { status: 404 });

    const parameter = await prisma.parameter.update({
      where: { id },
      data: {
        ...data,
        effectiveFrom: data.effectiveFrom ? new Date(data.effectiveFrom) : undefined,
        effectiveUntil: data.effectiveUntil ? new Date(data.effectiveUntil) : data.effectiveUntil === null ? null : undefined,
      },
    });

    await prisma.auditLog.create({
      data: {
        entity: "Parameter",
        entityId: id,
        action: "update",
        before: JSON.stringify({
          value: before.value,
          source: before.source,
          effectiveFrom: before.effectiveFrom,
          effectiveUntil: before.effectiveUntil,
        }),
        after: JSON.stringify({
          value: parameter.value,
          source: parameter.source,
          effectiveFrom: parameter.effectiveFrom,
          effectiveUntil: parameter.effectiveUntil,
        }),
        context: `Edición manual del parámetro ${parameter.key}`,
      },
    });

    return NextResponse.json({ parameter });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error desconocido" }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const existing = await prisma.parameter.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Parámetro no encontrado" }, { status: 404 });

    // Soft delete: marcar effectiveUntil = ahora
    const parameter = await prisma.parameter.update({
      where: { id },
      data: { effectiveUntil: new Date() },
    });

    await prisma.auditLog.create({
      data: {
        entity: "Parameter",
        entityId: id,
        action: "delete",
        before: JSON.stringify(existing),
        context: `Soft delete del parámetro ${existing.key} (marcado como vencido)`,
      },
    });

    return NextResponse.json({ parameter, message: "Parámetro marcado como vencido" });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error desconocido" }, { status: 400 });
  }
}
