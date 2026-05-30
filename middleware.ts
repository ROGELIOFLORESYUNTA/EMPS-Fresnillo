/**
 * Middleware Next.js — asegura que cada visitante tenga una cookie de workspace.
 *
 * FASE G.I: sin login. La cookie `emps_workspace_id` identifica al visitante
 * de forma anónima. Persiste 1 año. Si la persona limpia cookies, pierde su workspace
 * (advertir en /mi-workspace).
 *
 * El upsert en la tabla Workspace lo hace lib/workspace.ts cuando se consulta
 * por primera vez, NO aquí, porque Prisma no es compatible con Edge runtime.
 */
import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "emps_workspace_id";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

function generateWorkspaceId(): string {
  // cuid-like simple id (no instalamos cuid en edge). Suficientemente único.
  return "wsk_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function middleware(req: NextRequest) {
  const existing = req.cookies.get(COOKIE_NAME);
  if (existing) return NextResponse.next();

  const response = NextResponse.next();
  const id = generateWorkspaceId();
  response.cookies.set(COOKIE_NAME, id, {
    maxAge: ONE_YEAR_SECONDS,
    httpOnly: false,        // false porque el cliente puede querer leerlo para mostrarlo en /mi-workspace
    sameSite: "lax",
    path: "/",
  });
  return response;
}

export const config = {
  matcher: [
    // Aplica a todas las rutas excepto archivos estáticos y _next
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
