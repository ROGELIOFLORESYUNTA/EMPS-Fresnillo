/**
 * Endpoint del workspace propio del visitante (identificado por cookie).
 *
 * GET  /api/workspace/me  -> devuelve {workspace: {id, displayName, role, recoveryCode, ...},
 *                             lado, proyectos}. `lado` es el de este host y `proyectos`
 *                             cuántos proyectos propios tiene el visitante de ese lado.
 * PUT  /api/workspace/me  -> actualiza displayName, role y/o contactEmail
 *
 * Sin login. La identidad viene de la cookie emps_workspace_id.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentWorkspace, getCurrentWorkspaceId, peekWorkspace, logWorkspaceActivity } from "@/lib/workspace";
import { ROLES_VALIDOS } from "@/lib/roles";
import { normalizarCorreo } from "@/lib/identity";
import { getLado } from "@/lib/lado-server";
import { filtroDeLado } from "@/lib/acceso-proyecto";

export async function GET() {
  // Lectura: NO crea la fila. Si el visitante solo está navegando (cookie pero
  // sin fila), devolvemos una identidad anónima sintética para que el badge
  // muestre "Identifícate" sin ensuciar la BD. La fila nace cuando se ponen
  // nombre (PUT) o crean algo.
  const lado = await getLado();
  const workspace = await peekWorkspace();
  if (!workspace) {
    const id = await getCurrentWorkspaceId();
    if (!id) {
      return NextResponse.json({ workspace: null, lado, proyectos: 0 }, { status: 200 });
    }
    return NextResponse.json({
      workspace: { id, displayName: null, role: null, contactEmail: null, recoveryCode: null, createdAt: null, lastSeenAt: null },
      lado,
      proyectos: 0,
    });
  }
  const proyectos = await prisma.project.count({
    where: { workspaceId: workspace.id, isTemplate: false, ...filtroDeLado(lado) },
  });
  return NextResponse.json({
    workspace: {
      id: workspace.id,
      displayName: workspace.displayName,
      role: workspace.role,
      contactEmail: workspace.contactEmail,
      recoveryCode: workspace.recoveryCode,
      createdAt: workspace.createdAt,
      lastSeenAt: workspace.lastSeenAt,
    },
    lado,
    proyectos,
  });
}

export async function PUT(req: NextRequest) {
  const workspace = await getCurrentWorkspace();
  if (!workspace) {
    return NextResponse.json({ error: "Sin cookie de workspace." }, { status: 400 });
  }
  const body = await req.json().catch(() => ({}));
  const displayName = typeof body.displayName === "string" ? body.displayName.trim().slice(0, 80) : undefined;
  const role = typeof body.role === "string" ? body.role.trim() : undefined;
  const contactEmailRaw = typeof body.contactEmail === "string" ? body.contactEmail : undefined;

  if (role !== undefined && role !== "" && !ROLES_VALIDOS.has(role)) {
    return NextResponse.json({ error: `Rol inválido. Opciones: ${[...ROLES_VALIDOS].join(", ")}.` }, { status: 400 });
  }

  let contactEmail: string | null | undefined;
  if (contactEmailRaw !== undefined) {
    const parsed = normalizarCorreo(contactEmailRaw);
    if (parsed === false) {
      return NextResponse.json({ error: "Ese correo no se ve bien escrito. Revísalo o déjalo vacío." }, { status: 400 });
    }
    contactEmail = parsed;
  }

  const updated = await prisma.workspace.update({
    where: { id: workspace.id },
    data: {
      ...(displayName !== undefined ? { displayName: displayName || null } : {}),
      ...(role !== undefined ? { role: role || null } : {}),
      ...(contactEmail !== undefined ? { contactEmail } : {}),
    },
  });

  await logWorkspaceActivity(workspace.id, "workspace_identity_updated", {
    hasName: !!updated.displayName,
    role: updated.role,
    hasEmail: !!updated.contactEmail,
  });

  return NextResponse.json({
    workspace: {
      id: updated.id,
      displayName: updated.displayName,
      role: updated.role,
      contactEmail: updated.contactEmail,
      recoveryCode: updated.recoveryCode,
    },
  });
}
