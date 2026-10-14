import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { isAdmin } from "@/lib/admin-auth";
import { cargarProyectoConAcceso } from "@/lib/acceso-proyecto";
import { cargarCotizacion } from "@/lib/cotizacion-server";
import { ladoDelProyecto } from "@/lib/lado";
import { getLado } from "@/lib/lado-server";
import { peekWorkspace } from "@/lib/workspace";
import { CotizacionFormulario } from "./cotizacion-formulario";

export const metadata: Metadata = { title: "Cotización para tu cliente" };

/**
 * La cotización que le llevas a tu cliente: editas lo que dice y abajo ves cómo
 * la va a ver. Solo existe en la cara del desarrollador; en la del Ayuntamiento
 * contesta 404 igual que un proyecto del otro lado.
 */
export default async function CotizacionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if ((await getLado()) !== "desarrollador") notFound();

  // Dueño y lado: 404 si el proyecto es de otro workspace o del otro lado.
  const { project } = await cargarProyectoConAcceso(id);
  if (!project || ladoDelProyecto(project.lado) !== "desarrollador") notFound();

  const workspace = await peekWorkspace();
  const carga = await cargarCotizacion(id, {
    puedeEditar: !project.isTemplate || (await isAdmin()),
    proveedorNombrePorOmision: workspace?.displayName ?? null,
  });
  if (!carga) notFound();

  return (
    <div className="space-y-8">
      <Breadcrumbs
        items={[
          { label: "Mis proyectos", href: "/projects" },
          { label: project.name, href: `/projects/${id}` },
          { label: "Cotización" },
        ]}
      />

      <div>
        <h1 className="text-titulo text-tinta">Cotización para tu cliente</h1>
        <p className="mt-3 max-w-2xl text-base text-tinta-suave">
          Aquí dejas lista la hoja que le llevas a tu cliente: el precio, el tiempo, lo que incluye y lo que no, el precio de los cambios y la
          forma de pago. Tu cliente solo ve esa hoja. No ve tus costos, tu equipo ni cuánto ganas.
        </p>
        {carga.guardada && carga.campos.numero && (
          <p className="mt-2 text-sm font-semibold text-tinta">Cotización {carga.campos.numero}</p>
        )}
      </div>

      {carga.sinEstimacion ? (
        <div className="space-y-3 rounded-lg border border-border bg-lienzo p-6">
          <p className="text-base text-tinta">Para preparar la cotización primero hay que calcular el precio de este proyecto.</p>
          <Link
            href={`/projects/${id}/estimate`}
            className="inline-flex h-12 items-center justify-center rounded-lg bg-marino px-7 text-base font-semibold text-white transition-colors hover:bg-marino/90"
          >
            Calcular el precio
          </Link>
        </div>
      ) : (
        <CotizacionFormulario inicial={carga} />
      )}
    </div>
  );
}
