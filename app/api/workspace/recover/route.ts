/**
 * Recuperar un workspace desde otro dispositivo usando su código corto.
 *
 * POST /api/workspace/recover { code: "ABCD-1234" }
 *   → Si el código existe, cambia la cookie emps_workspace_id al workspace
 *     encontrado y devuelve sus datos. Las acciones siguientes ya quedan
 *     ligadas a ese workspace.
 *   → Si no existe, 404.
 *
 * Sin login: el código es la única credencial. Quien lo tenga, hereda el
 * workspace. Por eso conviene que cada usuario lo guarde como guardaría
 * una contraseña personal.
 */
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { findWorkspaceByRecoveryCode } from "@/lib/workspace";

const COOKIE_NAME = "emps_workspace_id";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const code = typeof body.code === "string" ? body.code : "";

  const workspace = await findWorkspaceByRecoveryCode(code);
  if (!workspace) {
    return NextResponse.json(
      { error: "Código no encontrado. Verifica que esté bien escrito (formato XXXX-XXXX, sin letras O/I/L ni dígitos 0/1)." },
      { status: 404 },
    );
  }

  const cookieStore = await cookies();
  cookieStore.set({
    name: COOKIE_NAME,
    value: workspace.id,
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    httpOnly: true,
    sameSite: "lax",
  });

  return NextResponse.json({
    workspace: {
      id: workspace.id,
      displayName: workspace.displayName,
      role: workspace.role,
      recoveryCode: workspace.recoveryCode,
    },
  });
}
