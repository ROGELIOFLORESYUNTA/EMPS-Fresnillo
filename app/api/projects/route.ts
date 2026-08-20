import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { projectCreateSchema } from "@/lib/validators";
import { getCurrentWorkspace, peekWorkspace, logWorkspaceActivity } from "@/lib/workspace";
import { ROLES_VALIDOS } from "@/lib/roles";
import { normalizarNombre, normalizarCorreo } from "@/lib/identity";

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
 * POST: asigna automáticamente el workspaceId del cookie al proyecto nuevo.
 *
 * Puede venir un bloque `identity` cuando la persona todavía no se ha
 * identificado: es lo que el formulario de alta le pide antes de dejarlo
 * continuar (nombre y desde qué lado va a usar el sistema; el correo es
 * opcional). La obligatoriedad vive en el formulario, no aquí, porque este
 * endpoint también lo usan las pruebas y las integraciones externas.
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

    const identity = body?.identity;
    if (identity && typeof identity === "object") {
      const displayName =
        typeof identity.displayName === "string" ? normalizarNombre(identity.displayName) : undefined;
      if (displayName === false) {
        return NextResponse.json({ error: "Escribe tu nombre para saber de quién es este proyecto." }, { status: 400 });
      }
      const role = typeof identity.role === "string" ? identity.role.trim() : undefined;
      if (role !== undefined && role !== "" && !ROLES_VALIDOS.has(role)) {
        return NextResponse.json({ error: "Elige desde qué lado vas a usar el sistema." }, { status: 400 });
      }
      const correo =
        typeof identity.contactEmail === "string" ? normalizarCorreo(identity.contactEmail) : undefined;
      if (correo === false) {
        return NextResponse.json({ error: "Ese correo no se ve bien escrito. Revísalo o déjalo vacío." }, { status: 400 });
      }

      // Solo se completa lo que falta: si la persona ya tenía nombre, un alta
      // posterior no se lo pisa.
      const cambios = {
        ...(displayName && !workspace.displayName ? { displayName } : {}),
        ...(role && !workspace.role ? { role } : {}),
        ...(correo && !workspace.contactEmail ? { contactEmail: correo } : {}),
      };
      if (Object.keys(cambios).length > 0) {
        await prisma.workspace.update({ where: { id: workspace.id }, data: cambios });
        await logWorkspaceActivity(workspace.id, "workspace_identity_updated", {
          hasName: !!(cambios.displayName ?? workspace.displayName),
          role: cambios.role ?? workspace.role,
          hasEmail: !!(cambios.contactEmail ?? workspace.contactEmail),
          origen: "alta_de_proyecto",
        });
      }
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
