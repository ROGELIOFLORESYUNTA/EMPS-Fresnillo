import Link from "next/link";
import { ChevronLeft, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PrintButton } from "@/components/print-button";
import { CotizacionDocumento } from "@/components/cotizacion-documento";
import { isAdmin } from "@/lib/admin-auth";
import { documentoDeCarga } from "@/lib/cotizacion";
import { cargarCotizacion } from "@/lib/cotizacion-server";
import { peekWorkspace } from "@/lib/workspace";

/**
 * Reporte "Cotización para tu cliente": la hoja que se imprime o se guarda en
 * PDF. Es el mismo documento que ve el cliente por el enlace compartido. La
 * barra de arriba (volver, editar, imprimir) no sale en papel.
 *
 * Quien llama ya revisó que el reporte existe en esta cara y que el proyecto
 * se puede abrir (dueño y lado).
 */
export async function ReporteCotizacion({ project }: { project: { id: string; isTemplate: boolean } }) {
  const workspace = await peekWorkspace();
  const carga = await cargarCotizacion(project.id, {
    puedeEditar: !project.isTemplate || (await isAdmin()),
    proveedorNombrePorOmision: workspace?.displayName ?? null,
  });
  const documento = carga ? documentoDeCarga(carga) : null;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <Link href={`/projects/${project.id}/reports`} className="text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="inline h-4 w-4" /> Volver
        </Link>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={`/projects/${project.id}/cotizacion`}>
              <Pencil className="mr-2 h-4 w-4" />
              Editar la cotización
            </Link>
          </Button>
          <PrintButton />
        </div>
      </div>

      {carga && !carga.guardada && !carga.sinEstimacion && (
        <p className="no-print rounded-md border border-border bg-papel px-4 py-3 text-sm text-tinta">
          Esta cotización todavía no está guardada: lleva los datos con los que arrancaría. Edítala y guárdala para que tenga su número.
        </p>
      )}
      {carga?.desactualizada && (
        <p className="no-print rounded-md border border-border bg-papel px-4 py-3 text-sm text-tinta">
          Esta hoja conserva el precio con el que se guardó. Después volviste a calcular y hoy el precio sería otro: entra a editarla para
          actualizarlo.
        </p>
      )}

      {documento ? (
        <CotizacionDocumento documento={documento} />
      ) : (
        <p className="rounded-md border border-border bg-lienzo px-4 py-6 text-sm text-tinta">
          Este proyecto todavía no tiene un precio calculado, y sin él no hay cotización. Calcúlalo primero.
        </p>
      )}
    </div>
  );
}
