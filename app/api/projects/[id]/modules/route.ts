import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { moduleCreateSchema } from "@/lib/validators";
import { getCurrentWorkspace, logWorkspaceActivity } from "@/lib/workspace";

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
    const workspace = await getCurrentWorkspace();
    if (workspace) {
      await logWorkspaceActivity(workspace.id, "module_created", {
        projectId: id,
        moduleId: mod.id,
        type: data.type,
        complexity: data.complexity,
        clarity: data.clarity,
        criticality: data.criticality,
      });
    }
    return NextResponse.json({ module: mod }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "error" }, { status: 400 });
  }
}
