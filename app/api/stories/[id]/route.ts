import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { storyCreateSchema } from "@/lib/validators";
import { puedeAbrirProyecto } from "@/lib/acceso-proyecto";

const NO_ENCONTRADO = NextResponse.json({ error: "no encontrado" }, { status: 404 });

/** Una historia se toca solo si se puede abrir el proyecto de su módulo. */
async function tieneAcceso(storyId: string) {
  const story = await prisma.userStory.findUnique({ where: { id: storyId }, select: { module: { select: { projectId: true } } } });
  return story ? puedeAbrirProyecto(story.module.projectId) : false;
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!(await tieneAcceso(id))) return NO_ENCONTRADO;
    const body = await req.json();
    const data = storyCreateSchema.partial().parse(body);
    const story = await prisma.userStory.update({ where: { id }, data });
    return NextResponse.json({ story });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "error" }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await tieneAcceso(id))) return NO_ENCONTRADO;
  await prisma.userStory.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
