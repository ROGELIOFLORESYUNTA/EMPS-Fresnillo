import type { ReactNode } from "react";
import type { DocumentoDeCotizacion } from "@/lib/cotizacion";
import { formatMXN } from "@/lib/utils";

/**
 * La cotización que el desarrollador le entrega a su cliente.
 *
 * Es el único documento que el cliente ve: el precio, el tiempo, lo que se
 * construye y lo que no, el precio de los cambios, el mantenimiento, la forma
 * de pago y las condiciones que la ley pide por escrito. No lleva nómina,
 * costo, utilidad ni capital de trabajo: no están en `DocumentoDeCotizacion`.
 *
 * Sin estado y sin nada del servidor, para que el mismo componente sirva en la
 * vista previa del formulario, en el reporte imprimible y en el enlace
 * compartido. Blanco, con bordes de 1 px y sin sombras, para que se imprima
 * igual que se ve.
 */

const pesosEnteros = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });

const decimal1 = (n: number) => n.toLocaleString("es-MX", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const porcentaje = (n: number) => n.toLocaleString("es-MX", { maximumFractionDigits: 1 });

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="break-inside-avoid border-t border-border pt-5">
      <h2 className="text-seccion text-marino">{titulo}</h2>
      <div className="mt-3 space-y-2 text-sm text-tinta">{children}</div>
    </section>
  );
}

function Lista({ items }: { items: readonly string[] }) {
  return (
    <ul className="list-disc space-y-1 pl-5">
      {items.map((t, i) => (
        <li key={i}>{t}</li>
      ))}
    </ul>
  );
}

function LineaDeFirma({ etiqueta }: { etiqueta: string }) {
  return (
    <div>
      <div className="h-10 border-b border-tinta" />
      <p className="mt-1 text-xs text-tinta-suave">{etiqueta}</p>
    </div>
  );
}

export function CotizacionDocumento({ documento: d }: { documento: DocumentoDeCotizacion }) {
  const hayMantenimiento = d.mantenimiento.incluido && d.mantenimiento.mensual !== null;
  return (
    <article aria-label="Cotización" className="mx-auto w-full max-w-3xl space-y-6 border border-border bg-lienzo p-6 text-tinta sm:p-10">
      {/* Encabezado: quién cotiza, número, fecha y vigencia */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-seccion break-words text-marino">{d.proveedor.nombre || "Nombre de quien cotiza"}</p>
          {d.proveedor.rfc && <p className="text-sm text-tinta-suave">RFC {d.proveedor.rfc}</p>}
          {d.proveedor.contacto && <p className="text-sm text-tinta-suave break-words">{d.proveedor.contacto}</p>}
        </div>
        <div className="text-sm sm:text-right">
          <p className="text-xs font-bold uppercase tracking-wide text-tinta-suave">Cotización</p>
          <p className="text-base font-bold">{d.numero ?? "Sin guardar todavía"}</p>
          <p>Fecha: {d.fechaTexto}</p>
          <p>
            Vigencia: {d.vigenciaDias} {d.vigenciaDias === 1 ? "día" : "días"}, hasta el {d.vigenciaHastaTexto}
          </p>
        </div>
      </header>

      {/* Para quién y qué opción se cotiza */}
      <section className="break-inside-avoid border-t border-border pt-5">
        <p className="text-xs font-bold uppercase tracking-wide text-tinta-suave">Para</p>
        <p className="mt-1 text-base font-bold break-words">{d.cliente || "Nombre de tu cliente"}</p>
        <p className="text-sm text-tinta">{d.proyecto.nombre}</p>
        {d.proyecto.objetivo && <p className="mt-1 text-sm text-tinta-suave">{d.proyecto.objetivo}</p>}
        <p className="mt-3 text-sm">{d.opcion.linea}</p>
      </section>

      {/* El precio y el tiempo */}
      <section className="break-inside-avoid border-t border-border pt-5">
        <p className="text-xs font-bold uppercase tracking-wide text-tinta-suave">Precio del desarrollo, con IVA</p>
        <p className="mt-1 text-[40px] font-extrabold leading-none tracking-tight text-marino tabular-nums">{formatMXN(d.precio.total)}</p>
        <dl className="mt-4 space-y-1 text-sm">
          <div className="flex items-baseline justify-between gap-4 border-b border-border pb-1">
            <dt className="text-tinta-suave">Subtotal</dt>
            <dd className="font-semibold tabular-nums">{formatMXN(d.precio.subtotal)}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4 border-b border-border pb-1">
            <dt className="text-tinta-suave">IVA ({porcentaje(d.precio.tasaIvaPct)} %)</dt>
            <dd className="font-semibold tabular-nums">{formatMXN(d.precio.iva)}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-tinta-suave">Tiempo</dt>
            <dd className="font-semibold">
              {decimal1(d.tiempo.semanas)} semanas (unos {decimal1(d.tiempo.meses)} meses)
            </dd>
          </div>
        </dl>
      </section>

      {/* Lo que se construye */}
      <Seccion titulo="Qué se va a construir">
        <ul className="space-y-1.5">
          {d.alcance.map((m, i) => (
            <li key={i}>
              <span className="font-semibold">{m.nombre}.</span> {m.linea}
            </li>
          ))}
        </ul>
      </Seccion>

      {/* Licencias que paga el cliente: solo en plataformas de armado */}
      {d.licencias && (
        <Seccion titulo="Licencias a cargo del cliente">
          <p>
            La plataforma con la que se arma el sistema cobra una licencia por cada persona que lo usa, y la paga el cliente directamente a la
            plataforma mientras use el sistema: unos <strong>{pesosEnteros.format(d.licencias.mensualMXN)} al mes</strong> por {d.licencias.usuarios}{" "}
            {d.licencias.usuarios === 1 ? "persona" : "personas"} ({d.licencias.usdPorUsuario} USD por persona
            {d.licencias.tipoCambio > 0 ? `, a ${d.licencias.tipoCambio.toLocaleString("es-MX")} pesos por dólar` : ""}).
          </p>
          {d.licencias.supuestos && (
            <p className="text-tinta-suave">El número de personas es un supuesto; se confirma antes de firmar.</p>
          )}
          <p className="text-tinta-suave">Este monto no está en el precio de arriba.</p>
        </Seccion>
      )}

      {/* Lo que no se incluye y lo que se supone */}
      <div className="grid gap-6 sm:grid-cols-2">
        <Seccion titulo="Qué no incluye">
          {d.exclusiones.length > 0 ? <Lista items={d.exclusiones} /> : <p className="text-tinta-suave">Sin exclusiones anotadas.</p>}
        </Seccion>
        <Seccion titulo="Supuestos">
          {d.supuestos.length > 0 ? <Lista items={d.supuestos} /> : <p className="text-tinta-suave">Sin supuestos anotados.</p>}
        </Seccion>
      </div>

      {/* Precio de los cambios */}
      <Seccion titulo="Precio de los cambios">
        <p className="text-tinta-suave">
          Los cambios se cotizan por escrito antes de hacerse. Estos son los precios de referencia por tipo de cambio, con IVA.
        </p>
        <ul className="divide-y divide-border border-t border-border">
          {d.cambios.map((c) => (
            <li key={c.type} className="flex flex-col gap-1 py-2 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
              <div className="min-w-0">
                <p className="font-semibold">{c.etiqueta}</p>
                <p className="text-tinta-suave">{c.descripcion}</p>
              </div>
              <p className="shrink-0 font-semibold tabular-nums sm:text-right">
                {c.type === "garantia"
                  ? "Sin cargo"
                  : c.maxConIva > 0
                    ? `${pesosEnteros.format(c.minConIva)} a ${pesosEnteros.format(c.maxConIva)}`
                    : "Se cotiza al pedirlo"}
              </p>
            </li>
          ))}
        </ul>
      </Seccion>

      {/* Mantenimiento */}
      <Seccion titulo="Mantenimiento después de la entrega">
        {hayMantenimiento ? (
          <>
            <p>
              <span className="text-xl font-extrabold tabular-nums text-marino">{formatMXN(d.mantenimiento.mensual)}</span>{" "}
              <span className="font-semibold">al mes, IVA incluido.</span>
            </p>
            <p className="text-tinta-suave">{d.mantenimiento.cubre}</p>
          </>
        ) : (
          <>
            <p className="font-semibold">No incluido.</p>
            <p className="text-tinta-suave">Si lo necesitas después de la entrega, se cotiza por separado.</p>
          </>
        )}
      </Seccion>

      {/* Forma de pago */}
      <Seccion titulo="Forma de pago">
        <ul className="divide-y divide-border border-y border-border">
          {d.pagos.map((p, i) => (
            <li key={i} className="flex items-baseline justify-between gap-4 py-2">
              <div className="min-w-0">
                <p className="font-semibold">{p.concepto}</p>
                <p className="text-tinta-suave">{p.cuando}</p>
              </div>
              <p className="shrink-0 text-right tabular-nums">
                <span className="font-semibold">{formatMXN(p.monto)}</span>
                <span className="block text-tinta-suave">{porcentaje(p.porcentaje)} %</span>
              </p>
            </li>
          ))}
        </ul>
        <p className="text-tinta-suave">Los montos incluyen IVA.</p>
      </Seccion>

      {/* Condiciones que la ley pide por escrito */}
      <Seccion titulo="Condiciones">
        <Lista items={d.condiciones} />
      </Seccion>

      {d.notas && (
        <Seccion titulo="Notas">
          <p className="whitespace-pre-line">{d.notas}</p>
        </Seccion>
      )}

      {/* Aceptación */}
      <section className="break-inside-avoid border-t border-border pt-5">
        <h2 className="text-seccion text-marino">Aceptación</h2>
        <p className="mt-3 text-sm">
          Al firmar, {d.cliente || "el cliente"} acepta esta cotización, sus supuestos y lo que no incluye.
        </p>
        <div className="mt-6 grid gap-8 sm:grid-cols-2">
          <div className="space-y-4">
            <p className="text-sm font-semibold break-words">Por {d.proveedor.nombre || "quien cotiza"}</p>
            <LineaDeFirma etiqueta="Nombre" />
            <LineaDeFirma etiqueta="Firma" />
          </div>
          <div className="space-y-4">
            <p className="text-sm font-semibold break-words">Por {d.cliente || "el cliente"}</p>
            <LineaDeFirma etiqueta="Nombre" />
            <LineaDeFirma etiqueta="Fecha" />
            <LineaDeFirma etiqueta="Firma" />
          </div>
        </div>
      </section>

      {/* Pie: vigencia y cambios ya aceptados */}
      <footer className="space-y-1 border-t border-border pt-4 text-xs text-tinta-suave">
        <p>
          Esta cotización vale {d.vigenciaDias} {d.vigenciaDias === 1 ? "día" : "días"}, hasta el {d.vigenciaHastaTexto}. Después, el precio y el
          plazo se confirman por escrito.
        </p>
        {d.acumulado && (
          <p>
            Cambios aceptados hasta hoy: {d.acumulado.aceptados}, por {formatMXN(d.acumulado.monto)} sin IVA, que son el {porcentaje(d.acumulado.porcentaje)} %
            del precio pactado.
            {d.acumulado.excede
              ? ` Pasando del ${d.acumulado.limitePct} %, los cambios se tratan como un desarrollo nuevo y se cotizan aparte.`
              : ""}
          </p>
        )}
      </footer>
    </article>
  );
}
