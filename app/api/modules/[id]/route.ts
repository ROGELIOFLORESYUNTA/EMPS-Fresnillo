import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { moduleCreateSchema } from "@/lib/validators";
import { getCurrentWorkspace, logWorkspaceActivity } from "@/lib/workspace";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const mod = await prisma.module.findUnique({
    where: { id },
    include: { stories: true },
  });
  if (!mod) return NextResponse.json({ error: "no encontrado" }, { status: 404 });
  return NextResponse.json({ module: mod });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const data = moduleCreateSchema.partial().parse(body);
    const mod = await prisma.module.update({ where: { id }, data });
    // Registro para la cronología "qué se modificó después de decidir".
    const workspace = await getCurrentWorkspace();
    if (workspace) {
      await logWorkspaceActivity(workspace.id, "module_updated", {
        projectId: mod.projectId,
        moduleId: mod.id,
        name: mod.name,
      });
    }
    return NextResponse.json({ module: mod });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "error" }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.module.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
