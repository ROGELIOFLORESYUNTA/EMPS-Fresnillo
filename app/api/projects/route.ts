import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { projectCreateSchema } from "@/lib/validators";
import { getCurrentWorkspace, peekWorkspace, logWorkspaceActivity } from "@/lib/workspace";
import { ROLES_VALIDOS } from "@/lib/roles";
import { normalizarNombre, normalizarCorreo } from "@/lib/identity";
import { rolDeLado } from "@/lib/lado";
import { getLado } from "@/lib/lado-server";
import { filtroDeLado } from "@/lib/acceso-proyecto";

/**
 * GET: lista solo los proyectos del visitante actual y del lado donde está
 * (desarrollador o ayuntamiento, según el host).
 * Un visitante nuevo arranca en cero: no se le muestran plantillas ni
 * proyectos sin dueño, para que el sistema no aparente trabajo previo ajeno.
 */
export async function GET() {
  // Lectura: peekWorkspace no crea fila al solo listar.
  const workspace = await peekWorkspace();
  const lado = await getLado();
  const projects = await prisma.project.findMany({
    where: { workspaceId: workspace?.id ?? "__sin_workspace__", ...filtroDeLado(lado) },
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
 * identificado: es lo que el formulario de alta le ofrece (nombre y correo,
 * los dos opcionales; un nombre vacío cuenta como no dado). El lado ya no se
 * pregunta: lo decide el host. Este endpoint también lo usan las pruebas y las
 * integraciones externas, por eso sigue aceptando un `role` explícito.
 *
 * El proyecto queda marcado con el lado del host. Si la persona todavía no
 * tiene rol, se le pone el que implica su lado.
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

    const lado = await getLado();
    let rol = workspace.role;

    const identity = body?.identity;
    if (identity && typeof identity === "object") {
      const nombreCrudo = typeof identity.displayName === "string" ? identity.displayName.trim() : "";
      const displayName = nombreCrudo ? normalizarNombre(nombreCrudo) : undefined;
      if (displayName === false) {
        return NextResponse.json({ error: "Ese nombre es muy corto. Escribe al menos dos letras o déjalo vacío." }, { status: 400 });
      }
      const role = typeof identity.role === "string" ? identity.role.trim() : undefined;
      if (role !== undefined && role !== "" && !ROLES_VALIDOS.has(role)) {
        return NextResponse.json({ error: "Ese rol no es válido." }, { status: 400 });
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
      rol = cambios.role ?? rol;
    }

    // El lado implica el rol: sin rol todavía, se le pone el de su lado.
    if (!rol) {
      await prisma.workspace.update({ where: { id: workspace.id }, data: { role: rolDeLado(lado) } });
    }

    const project = await prisma.project.create({
      data: {
        ...data,
        targetDate: data.targetDate ? new Date(data.targetDate) : null,
        estimatedBudget: data.estimatedBudget ?? null,
        workspaceId: workspace.id,
        isTemplate: false,
        lado,
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
