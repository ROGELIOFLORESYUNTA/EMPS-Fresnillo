/**
 * Guardián: esta pantalla modifica valores que afectan a TODOS los visitantes
 * (no son ajustes personales), así que pide la clave de investigador.
 * Los ajustes que cada quien hace para sus propias estimaciones siguen
 * abiertos en /admin/parametros.
 */
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin-auth";

export default async function Layout({ children }: { children: React.ReactNode }) {
  if (!(await isAdmin())) redirect("/admin-login");
  return <>{children}</>;
}
