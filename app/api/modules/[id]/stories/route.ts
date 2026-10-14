import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { storyCreateSchema } from "@/lib/validators";
import { puedeAbrirProyecto } from "@/lib/acceso-proyecto";

const NO_ENCONTRADO = NextResponse.json({ error: "no encontrado" }, { status: 404 });

/** Las historias de un módulo se ven y se crean solo si se puede abrir su proyecto. */
async function tieneAcceso(moduleId: string) {
  const mod = await prisma.module.findUnique({ where: { id: moduleId }, select: { projectId: true } });
  return mod ? puedeAbrirProyecto(mod.projectId) : false;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await tieneAcceso(id))) return NO_ENCONTRADO;
  const stories = await prisma.userStory.findMany({
    where: { moduleId: id },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ stories });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!(await tieneAcceso(id))) return NO_ENCONTRADO;
    const body = await req.json();
    const data = storyCreateSchema.parse(body);
    const story = await prisma.userStory.create({
      data: { ...data, moduleId: id },
    });
    return NextResponse.json({ story }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "error" }, { status: 400 });
  }
}
