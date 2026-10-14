/**
 * Guardián del proyecto.
 *
 * Todo lo que cuelga de /projects/[id] (resumen, módulos, equipo, estimación,
 * cambios, resultado real y reportes) pasa aquí por la regla de dueño y de
 * lado (lib/acceso-proyecto.ts), en un solo lugar: varias pantallas son
 * componentes de cliente y no pueden validar por su cuenta. Las pantallas de
 * servidor y las APIs lo revisan otra vez, porque un layout no se vuelve a
 * ejecutar al pasar de una pantalla a otra del mismo proyecto.
 */
import { notFound } from "next/navigation";
import { cargarProyectoConAcceso } from "@/lib/acceso-proyecto";

export default async function ProyectoLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { project } = await cargarProyectoConAcceso(id);
  if (!project) notFound();
  return <>{children}</>;
}
