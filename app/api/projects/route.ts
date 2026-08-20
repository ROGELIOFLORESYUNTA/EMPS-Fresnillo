import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { projectCreateSchema } from "@/lib/validators";
import { getCurrentWorkspace, peekWorkspace, logWorkspaceActivity } from "@/lib/workspace";

/**
 * GET: lista solo los proyectos del visitante actual.
 * Un visitante nuevo arranca en cero: no se le muestran plantillas ni
 * proyectos sin dueño, para que el sistema no aparente trabajo previo ajeno.
 */
export async function GET() {
  // Lectura: peekWorkspace no crea fila al solo listar.
  const workspace = await peekWorkspace();
  const projects = await prisma.project.findMany({
    where: { workspaceId: workspace?.id ?? "__sin_workspace__" },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { modules: true, estimates: true, changes: true } },
    },
  });
  return NextResponse.json({ projects });
}

/**
 * POST - FASE G.I: asigna automáticamente el workspaceId del cookie al proyecto nuevo.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = projectCreateSchema.parse(body);

    const workspace = await getCurrentWorkspace();
    if (!workspace) {
      return NextResponse.json(
        { error: "No se pudo identificar el workspace. Recarga la página." },
        { status: 400 },
      );
    }

    const project = await prisma.project.create({
      data: {
        ...data,
        targetDate: data.targetDate ? new Date(data.targetDate) : null,
        estimatedBudget: data.estimatedBudget ?? null,
        workspaceId: workspace.id,
        isTemplate: false,
      },
    });

    await logWorkspaceActivity(workspace.id, "project_created", {
      projectId: project.id,
      name: project.name,
      clientType: project.clientType,
    });

    return NextResponse.json({ project }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "error" }, { status: 400 });
  }
}
