import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const updateSchema = z.object({
  sourceName: z.string().min(2).optional(),
  category: z.enum(["fiscal", "fiscal_state", "labor", "dataset", "procurement", "research", "technology"]).optional(),
  officialPriority: z.number().int().min(1).max(3).optional(),
  sourceUrl: z.string().url().optional(),
  refreshFrequency: z.enum(["manual", "daily", "weekly", "monthly", "quarterly", "yearly"]).optional(),
  parserType: z.enum(["manual_review", "pdf_manual", "csv", "json", "html"]).optional(),
  requiresHumanApproval: z.boolean().optional(),
  active: z.boolean().optional(),
  notes: z.string().nullable().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const source = await prisma.liveSourceRegistry.findUnique({
    where: { id },
    include: { snapshots: { orderBy: { checkedAt: "desc" }, take: 20 } },
  });
  if (!source) return NextResponse.json({ error: "Fuente no encontrada" }, { status: 404 });
  return NextResponse.json({ source });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const data = updateSchema.parse(body);
    const source = await prisma.liveSourceRegistry.update({ where: { id }, data });
    await prisma.auditLog.create({
      data: { entity: "LiveSourceRegistry", entityId: id, action: "update", after: JSON.stringify(source) },
    });
    return NextResponse.json({ source });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "error" }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    // Soft delete: marcar inactiva
    const source = await prisma.liveSourceRegistry.update({ where: { id }, data: { active: false } });
    await prisma.auditLog.create({ data: { entity: "LiveSourceRegistry", entityId: id, action: "delete", context: "Marcada como inactiva" } });
    return NextResponse.json({ source, message: "Fuente marcada como inactiva" });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "error" }, { status: 400 });
  }
}
