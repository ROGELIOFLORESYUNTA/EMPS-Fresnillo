/**
 * Salir del modo investigador: borra la cookie emps_admin_token.
 * Sin afectar la identidad de workspace del visitante.
 */
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE_NAME } from "@/lib/admin-auth";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.set({ name: ADMIN_COOKIE_NAME, value: "", maxAge: 0, path: "/" });
  return NextResponse.json({ ok: true });
}
