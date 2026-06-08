import { redirect } from "next/navigation";

// Alias de retrocompatibilidad: la URL "publica" ahora es /mi-cuenta.
// Mantenemos /mi-workspace como redirect 308 para no romper bookmarks
// o screenshots del sistema previo.
export default function MiWorkspaceRedirect() {
  redirect("/mi-cuenta");
}
