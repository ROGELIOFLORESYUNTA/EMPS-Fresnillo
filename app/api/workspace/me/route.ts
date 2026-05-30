/**
 * Endpoint del workspace propio del visitante (identificado por cookie).
 *
 * GET  /api/workspace/me  → devuelve {id, displayName, role, recoveryCode, ...}
 * PUT  /api/workspace/me  → actualiza displayName y/o role
 *
 * Sin login. La identidad viene de la cookie emps_workspace_id.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentWorkspace, logWorkspaceActivity } from "@/lib/workspace";

const ROLES_VALIDOS = new Set([
  "operador_municipal",
  "proveedor",
  "investigador",
  "explorando",
  "otro",
]);

export async function GET() {
  const workspace = await getCurrentWorkspace();
  if (!workspace) {
    return NextResponse.json({ workspace: null, error: "Sin cookie de workspace." }, { status: 400 });
  }
  return NextResponse.json({
    workspace: {
      id: workspace.id,
      displayName: workspace.displayName,
      role: workspace.role,
      recoveryCode: workspace.recoveryCode,
      createdAt: workspace.createdAt,
      lastSeenAt: workspace.lastSeenAt,
    },
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

  if (role !== undefined && role !== "" && !ROLES_VALIDOS.has(role)) {
    return NextResponse.json({ error: `Rol inválido. Opciones: ${[...ROLES_VALIDOS].join(", ")}.` }, { status: 400 });
  }

  const updated = await prisma.workspace.update({
    where: { id: workspace.id },
    data: {
      ...(displayName !== undefined ? { displayName: displayName || null } : {}),
      ...(role !== undefined ? { role: role || null } : {}),
    },
  });

  await logWorkspaceActivity(workspace.id, "workspace_identity_updated", {
    hasName: !!updated.displayName,
    role: updated.role,
  });

  return NextResponse.json({
    workspace: {
      id: updated.id,
      displayName: updated.displayName,
      role: updated.role,
      recoveryCode: updated.recoveryCode,
    },
  });
}
