import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { projectUpdateSchema } from "@/lib/validators";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      modules: { include: { stories: true } },
      team: true,
      estimates: { orderBy: { createdAt: "desc" }, take: 50 },
      changes: { orderBy: { createdAt: "desc" } },
      cashflow: { orderBy: { monthNumber: "asc" } },
    },
  });
  if (!project) return NextResponse.json({ error: "no encontrado" }, { status: 404 });
  return NextResponse.json({ project });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const data = projectUpdateSchema.parse(body);
    const project = await prisma.project.update({
      where: { id },
      data: {
        ...data,
        targetDate: data.targetDate ? new Date(data.targetDate) : data.targetDate === null ? null : undefined,
      },
    });
    return NextResponse.json({ project });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "error" }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.project.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
