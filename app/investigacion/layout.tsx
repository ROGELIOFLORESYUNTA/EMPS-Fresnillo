/**
 * Guardián de la zona de investigación.
 *
 * Todo lo que cuelga de /investigacion es material de la tesis: bitácoras,
 * datasets, modelos y paneles con datos agregados de todos los visitantes.
 * No es para el usuario que viene a estimar un proyecto, así que se pide la
 * clave de investigador en un solo lugar, y no pantalla por pantalla (varias
 * son componentes de cliente y no pueden validar por su cuenta).
 *
 * La metodología vive fuera de aquí, en /metodologia, porque esa sí conviene
 * que cualquiera la pueda leer: es la justificación del método.
 */
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin-auth";

export default async function InvestigacionLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAdmin())) redirect("/admin-login");
  return <>{children}</>;
}
