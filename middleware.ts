/**
 * Middleware Next.js: dos cosas, las dos sin base de datos (corre en Edge).
 *
 * 1. Decide el LADO por el host (ver lib/lado.ts) y lo manda al servidor en el
 *    encabezado x-emps-lado. Se sobrescribe lo que traiga el cliente: nadie
 *    puede elegir lado mandando el encabezado a mano.
 * 2. Asegura que cada visitante tenga una cookie de workspace anónima
 *    (`emps_workspace_id`, 1 año, sin login). El upsert en la tabla Workspace
 *    lo hace lib/workspace.ts, no aquí, porque Prisma no corre en Edge.
 *
 * La cookie es host-only: cada subdominio tiene su propio workspace, que es
 * justo lo que se quiere (un lado no hereda la identidad del otro).
 */
import { NextRequest, NextResponse } from "next/server";
import { HEADER_LADO, ladoDesdeHost } from "@/lib/lado";

const COOKIE_NAME = "emps_workspace_id";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

function generateWorkspaceId(): string {
  // cuid-like simple id (no instalamos cuid en edge). Suficientemente único.
  return "wsk_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function middleware(req: NextRequest) {
  const lado = ladoDesdeHost(req.headers.get("host"));
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set(HEADER_LADO, lado);
  const response = NextResponse.next({ request: { headers: requestHeaders } });

  if (!req.cookies.get(COOKIE_NAME)) {
    response.cookies.set(COOKIE_NAME, generateWorkspaceId(), {
      maxAge: ONE_YEAR_SECONDS,
      httpOnly: false,        // false porque el cliente puede querer leerlo para mostrarlo en /mi-workspace
      sameSite: "lax",
      path: "/",
    });
  }
  return response;
}

export const config = {
  matcher: [
    // Aplica a todas las rutas excepto archivos estáticos y _next
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
