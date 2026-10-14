import { getLado } from "@/lib/lado-server";
import { NuevoProyectoDesarrollador } from "@/components/nuevo-proyecto-desarrollador";
import { NuevoProyectoMunicipal } from "@/components/nuevo-proyecto-municipal";

export const metadata = {
  title: "Nuevo proyecto",
};

/**
 * El alta cambia por lado (lib/lado.ts): el desarrollador empieza con tres
 * campos y deja lo demás plegado; el Ayuntamiento conserva su formulario.
 */
export default async function NewProjectPage() {
  const lado = await getLado();
  return lado === "desarrollador" ? <NuevoProyectoDesarrollador /> : <NuevoProyectoMunicipal />;
}
