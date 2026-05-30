"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE_NAME } from "@/lib/admin-auth";

export async function adminLoginAction(formData: FormData) {
  const token = (formData.get("token") as string)?.trim() ?? "";
  const expected = process.env.ADMIN_SECRET;
  if (!expected) {
    redirect("/admin-login?error=no_secret");
  }
  if (token !== expected) {
    redirect("/admin-login?error=invalid");
  }
  const cookieStore = await cookies();
  cookieStore.set({
    name: ADMIN_COOKIE_NAME,
    value: token,
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
    httpOnly: true,
    sameSite: "lax",
  });
  redirect("/investigacion/admin-datos");
}
