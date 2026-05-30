/**
 * Auth simple para el panel de investigador (FASE G.I).
 * Sin NextAuth. Una sola cookie `emps_admin_token` con valor igual a ADMIN_SECRET.
 *
 * Configuración: agregar ADMIN_SECRET en .env (string largo y aleatorio).
 * Si la variable no existe en .env, el panel queda inaccesible (más seguro que
 * tener un default).
 */
import { cookies } from "next/headers";

const COOKIE_NAME = "emps_admin_token";

export async function isAdmin(): Promise<boolean> {
  const expected = process.env.ADMIN_SECRET;
  if (!expected) return false;
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  return token === expected;
}

export function setAdminCookieInstruction(token: string): { name: string; value: string; maxAge: number; path: string; httpOnly: boolean; sameSite: "lax" } {
  return {
    name: COOKIE_NAME,
    value: token,
    maxAge: 60 * 60 * 24 * 30, // 30 días
    path: "/",
    httpOnly: true,
    sameSite: "lax",
  };
}

export function clearAdminCookieInstruction(): { name: string; value: string; maxAge: number; path: string } {
  return { name: COOKIE_NAME, value: "", maxAge: 0, path: "/" };
}

export { COOKIE_NAME as ADMIN_COOKIE_NAME };
