import { CotizacionDocumento } from "@/components/cotizacion-documento";
import { PrintButton } from "@/components/print-button";
import { documentoDeCarga, fechaLarga } from "@/lib/cotizacion";
import { cargarCotizacion } from "@/lib/cotizacion-server";
import { COPIA } from "@/lib/lado-copy";

/**
 * Lo que ve el cliente cuando el desarrollador le comparte el enlace: solo la
 * cotización. No lleva el desglose del precio, ni las tarjetas de opciones, ni
 * la nota de la decisión, ni las preguntas del patrón: nada de la nómina, los
 * costos, la utilidad ni el capital de trabajo de quien cotiza.
 *
 * Quien llama ya encontró el proyecto por su enlace. El enlace no pasa por la
 * regla de dueño y lado: es de solo lectura y se comparte a propósito.
 */
export async function VistaDeCotizacion({ projectId }: { projectId: string }) {
  const carga = await cargarCotizacion(projectId, { puedeEditar: false });
  const documento = carga ? documentoDeCarga(carga) : null;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-3 rounded-md border bg-muted/40 px-4 py-2 text-xs text-muted-foreground">
        <p>
          Vista compartida de solo lectura. Quien la compartió puede quitar el enlace cuando quiera. Generada por {COPIA.desarrollador.marca} el{" "}
          {fechaLarga(new Date())}.
        </p>
        {documento && <PrintButton />}
      </div>

      {documento ? (
        <CotizacionDocumento documento={documento} />
      ) : (
        <p className="rounded-md border border-border bg-lienzo px-4 py-6 text-sm text-tinta">Esta cotización todavía no está lista.</p>
      )}
    </div>
  );
}
