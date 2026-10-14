/**
 * Página pública: de dónde salen los números.
 *
 * Es la prueba de que las cifras del sistema no son inventadas. Abre con las
 * siete cifras que cualquiera reconoce (IVA, ISR, UMA, salario mínimo, impuesto
 * sobre nómina, una cuota patronal y el dólar), cada una con su fuente en una
 * línea y su enlace oficial. Debajo, los grupos de valores plegados con su
 * conteo y, al final, las leyes que respaldan lo que dice una cotización.
 * Cualquiera puede entrar: es la señal de confianza para quien va a decidir
 * dinero, público o privado.
 */
import Link from "next/link";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ParameterManualSheet } from "@/components/parameter-manual-sheet";
import { CATEGORIAS, FUENTE_POR_CATEGORIA, ORDEN_CATEGORIAS, categorizar, nombreLegible, fuenteLegible, valorLegible } from "@/lib/parameter-labels";
import { LEYES_DE_LA_COTIZACION, TOTAL_DE_ARTICULOS } from "@/lib/leyes-cotizacion";

export const metadata = {
  title: "De dónde salen los números",
  description: "Los valores fiscales y laborales que usa el cotizador, con su fundamento legal y su fuente oficial.",
};

/**
 * Las cifras que todos reconocen. El valor sale de la tabla Parameter (así
 * nunca se contradice con el cálculo); aquí solo va cómo se llama y dónde se
 * comprueba. `enlace` es el respaldo cuando el parámetro no trae el suyo.
 */
const CIFRAS_CLAVE: ReadonlyArray<{
  clave: string;
  titulo: string;
  fuente: string;
  /** Mostrar desde cuándo vale (solo el dólar, que cambia seguido). */
  conFecha?: boolean;
  enlace?: string;
}> = [
  { clave: "IVA_GENERAL", titulo: "IVA", fuente: "Ley del IVA, artículo 1" },
  { clave: "ISR_PERSONA_MORAL", titulo: "ISR de empresas", fuente: "Ley del ISR, artículo 9" },
  { clave: "UMA_DIARIA", titulo: "UMA por día", fuente: "INEGI, Diario Oficial" },
  { clave: "SALARIO_MINIMO_GENERAL_DIARIO", titulo: "Salario mínimo por día", fuente: "CONASAMI, Diario Oficial" },
  { clave: "ISN_ZACATECAS", titulo: "Impuesto sobre nómina de Zacatecas", fuente: "Hacienda de Zacatecas" },
  {
    clave: "INFONAVIT_PATRON",
    titulo: "Cuota patronal de vivienda (INFONAVIT)",
    fuente: "Ley del INFONAVIT, artículo 29",
    enlace: "https://www.diputados.gob.mx/LeyesBiblio/pdf/LIFNVT.pdf",
  },
  { clave: "TIPO_CAMBIO_USD_MXN", titulo: "Precio del dólar", fuente: "Banco de México", conFecha: true },
];

// Las fechas de vigencia se guardan a medianoche UTC: se leen en UTC para que el 1 de enero no salga como 31 de diciembre.
const mesYAnio = (d: Date) => d.toLocaleDateString("es-MX", { month: "long", year: "numeric", timeZone: "UTC" });

export default async function FuentesPage() {
  const parameters = await prisma.parameter.findMany({
    orderBy: [{ year: "desc" }, { key: "asc" }],
  });

  const grupos: Record<string, typeof parameters> = {};
  for (const p of parameters) {
    (grupos[categorizar(p.key)] ??= []).push(p);
  }
  // Primero los impuestos y cuotas que cualquiera reconoce, no el orden alfabetico.
  const gruposOrdenados = Object.entries(grupos).sort(
    ([a], [b]) => ORDEN_CATEGORIAS.indexOf(a) - ORDEN_CATEGORIAS.indexOf(b),
  );

  const ahora = new Date();
  const vigentes = parameters.filter((p) => !p.effectiveUntil || p.effectiveUntil >= ahora);
  const ultimaActualizacion = parameters.reduce<Date | null>(
    (max, p) => (max === null || p.createdAt > max ? p.createdAt : max),
    null,
  );

  // Las cifras grandes: la primera vigente de cada clave.
  const cifras = CIFRAS_CLAVE.flatMap((c) => {
    const p = vigentes.find((x) => x.key === c.clave);
    if (!p) return [];
    const legible = valorLegible(p.value, p.unit);
    const esDolar = c.clave === "TIPO_CAMBIO_USD_MXN";
    return [
      {
        ...c,
        valor: esDolar ? `$${legible.valor}` : legible.valor,
        enlaceFinal: p.sourceUrl ?? c.enlace ?? null,
        desde: c.conFecha ? mesYAnio(p.effectiveFrom) : null,
      },
    ];
  });

  return (
    <div className="space-y-10">
      <Breadcrumbs items={[{ label: "De dónde salen los números" }]} />

      <header>
        <h1 className="text-titulo text-tinta">De dónde salen los números</h1>
        <p className="mt-2 max-w-2xl text-base text-tinta-suave">Cada cifra del cálculo viene de una ley o de una publicación oficial.</p>
        <p className="mt-1 text-base text-tinta-suave">
          {vigentes.length} valores en {Object.keys(grupos).length} grupos. Última revisión: {ultimaActualizacion ? mesYAnio(ultimaActualizacion) : "sin dato"}.
        </p>
      </header>

      {/* Las cifras que todos reconocen, cada una con su fuente */}
      <section aria-label="Las cifras que todos reconocen">
        <ul className="grid gap-x-10 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
          {cifras.map((c) => (
            <li key={c.clave} className="border-t pt-4">
              <p className="text-base text-tinta-suave">{c.titulo}</p>
              <p className="mt-1 text-[2.5rem] font-extrabold leading-none tracking-tight text-marino">
                {c.valor}
              </p>
              <p className="mt-2 text-base">
                {c.enlaceFinal ? (
                  <a href={c.enlaceFinal} target="_blank" rel="noopener noreferrer" className="font-medium text-accion underline underline-offset-4">
                    {c.fuente}
                  </a>
                ) : (
                  <span className="text-tinta">{c.fuente}</span>
                )}
                {c.desde && <span className="text-tinta-suave">, desde {c.desde}</span>}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {/* Todos los valores, por grupo, plegados con su conteo */}
      <section aria-labelledby="todos-los-valores" className="space-y-3">
        <h2 id="todos-los-valores" className="text-seccion text-tinta">
          Todos los valores, por grupo
        </h2>
        <p className="text-base text-tinta-suave">Toca un grupo para ver cada valor.</p>

        {gruposOrdenados.map(([cat, items]) => (
          <details key={cat} className="rounded-xl border bg-lienzo">
            <summary className="flex cursor-pointer flex-wrap items-baseline justify-between gap-x-4 px-5 py-4">
              <span className="text-base font-semibold text-tinta">{CATEGORIAS[cat] ?? cat}</span>
              <span className="text-base text-tinta-suave">{items.length} {items.length === 1 ? "valor" : "valores"}</span>
            </summary>
            <div className="px-5 pb-5">
              <p className="mb-3 text-base text-tinta-suave">
                {FUENTE_POR_CATEGORIA[cat] ?? ""} Toca el símbolo de información de cada valor para ver de dónde se obtuvo y qué afecta.
              </p>
              <div className="overflow-x-auto">
                <Table className="min-w-[40rem]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Concepto</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Unidad</TableHead>
                      <TableHead>Fundamento o fuente</TableHead>
                      <TableHead>Vigente desde</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((p) => {
                      const legible = valorLegible(p.value, p.unit);
                      return (
                        <TableRow key={p.id}>
                          <TableCell>
                            <span className="inline-flex items-center text-sm font-medium">
                              {nombreLegible(p.key)}
                              <ParameterManualSheet parameterKey={p.key} />
                            </span>
                            {p.notes && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{p.notes}</p>}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-right font-medium">
                            {legible.valor === "tabla" ? <Badge variant="outline" className="text-xs">tabla</Badge> : legible.valor}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs font-normal">{legible.unidad}</Badge>
                          </TableCell>
                          <TableCell className="max-w-xs text-xs">
                            {fuenteLegible(p.source)}
                            {p.sourceUrl && (
                              <a href={p.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-0.5 block text-primary hover:underline">
                                Ver la publicación oficial
                              </a>
                            )}
                          </TableCell>
                          <TableCell className="text-xs">{p.effectiveFrom.toLocaleDateString("es-MX", { timeZone: "UTC" })}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          </details>
        ))}

        {/* Las leyes de la cotización: estáticas, no salen de la tabla de parámetros */}
        <details className="rounded-xl border bg-lienzo">
          <summary className="flex cursor-pointer flex-wrap items-baseline justify-between gap-x-4 px-5 py-4">
            <span className="text-base font-semibold text-tinta">Leyes de la cotización</span>
            <span className="text-base text-tinta-suave">{LEYES_DE_LA_COTIZACION.length} leyes, {TOTAL_DE_ARTICULOS} artículos</span>
          </summary>
          <div className="space-y-6 px-5 pb-5">
            <p className="text-base text-tinta-suave">
              No son cifras del cálculo: son los artículos que respaldan lo que dice una cotización. Sirven para saber dónde buscar, no son asesoría legal.
            </p>
            {LEYES_DE_LA_COTIZACION.map((ley) => (
              <section key={ley.clave} aria-label={ley.nombre}>
                <h3 className="text-base font-semibold text-tinta">
                  {ley.nombre} ({ley.clave}){" "}
                  <a href={ley.url} target="_blank" rel="noopener noreferrer" className="ml-1 font-medium text-accion underline underline-offset-4">
                    Ver la ley completa
                  </a>
                </h3>
                <ul className="mt-2 divide-y">
                  {ley.articulos.map((a) => (
                    <li key={a.articulo} className="grid gap-x-4 gap-y-0.5 py-2 sm:grid-cols-[7.5rem_minmax(0,1fr)]">
                      <span className="text-base font-semibold text-tinta">Artículo {a.articulo}</span>
                      <span className="text-base text-tinta-suave">{a.significa}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </details>
      </section>

      <p className="max-w-3xl text-base text-tinta-suave">
        Estos valores alimentan el cálculo, pero cada estimación guarda además una copia de los valores con los que se hizo, para que un número emitido hace meses se pueda auditar tal como se generó. Las estimaciones son preliminares: la determinación oficial fiscal y laboral requiere revisión profesional contable, fiscal y legal.
      </p>

      <p className="flex flex-wrap gap-x-6 gap-y-2 text-base">
        <Link href="/metodologia" className="font-semibold text-accion underline underline-offset-4">
          Cómo se calcula
        </Link>
        <Link href="/glossary" className="font-semibold text-accion underline underline-offset-4">
          Glosario de términos
        </Link>
        <Link href="/admin/parametros" className="font-semibold text-accion underline underline-offset-4">
          Ajustar estos valores para mis estimaciones
        </Link>
      </p>
    </div>
  );
}
