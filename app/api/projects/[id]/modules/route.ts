import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { moduleCreateSchema } from "@/lib/validators";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const modules = await prisma.module.findMany({
    where: { projectId: id },
    include: { stories: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ modules });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const data = moduleCreateSchema.parse(body);
    const mod = await prisma.module.create({
      data: { ...data, projectId: id },
    });
    return NextResponse.json({ module: mod }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "error" }, { status: 400 });
  }
}
