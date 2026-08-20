/**
 * Página pública: de dónde salen los números.
 *
 * Es la prueba de que las cifras del sistema no son inventadas. Muestra, en
 * solo lectura, los parámetros vigentes con su valor, su fundamento legal y
 * su fuente oficial. Cualquiera puede entrar: es la señal de confianza para
 * quien va a decidir dinero público.
 */
import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ShieldCheck, Sliders, BookOpenCheck } from "lucide-react";
import { ParameterManualSheet } from "@/components/parameter-manual-sheet";
import { CATEGORIAS, FUENTE_POR_CATEGORIA, ORDEN_CATEGORIAS, categorizar, nombreLegible, fuenteLegible, valorLegible } from "@/lib/parameter-labels";

export const metadata = {
  title: "De dónde salen los números | EMPS Fresnillo",
  description: "Los valores fiscales y laborales que usa el estimador, con su fundamento legal y su fuente oficial.",
};

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

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "De dónde salen los números" }]} />

      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-primary" />
          De dónde salen los números
        </h1>
        <p className="text-muted-foreground max-w-3xl mt-1">
          El sistema no inventa cifras. Cada impuesto, cuota y prestación que entra al cálculo viene de una
          ley o de una publicación oficial. Aquí están todos, con su valor vigente y su fundamento. Puedes
          revisar cualquiera antes de confiar en una estimación.
        </p>
      </div>

      <Card className="border-primary/30 bg-primary/[0.03]">
        <CardContent className="py-4 grid sm:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-2xl font-bold">{vigentes.length}</p>
            <p className="text-muted-foreground">valores vigentes en el cálculo</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{Object.keys(grupos).length}</p>
            <p className="text-muted-foreground">grupos: impuestos, cuotas y prestaciones</p>
          </div>
          <div>
            <p className="text-2xl font-bold">
              {ultimaActualizacion ? ultimaActualizacion.toLocaleDateString("es-MX", { month: "long", year: "numeric" }) : "—"}
            </p>
            <p className="text-muted-foreground">última revisión del catálogo</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" asChild>
          <Link href="/metodologia"><BookOpenCheck className="w-4 h-4 mr-2" />Cómo se calcula (metodología)</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/glossary">Glosario de términos</Link>
        </Button>
        <Button variant="ghost" asChild>
          <Link href="/admin/parametros"><Sliders className="w-4 h-4 mr-2" />Ajustar estos valores para mis estimaciones</Link>
        </Button>
      </div>

      {gruposOrdenados.map(([cat, items]) => (
        <Card key={cat}>
          <CardHeader>
            <CardTitle className="text-base">{CATEGORIAS[cat] ?? cat}</CardTitle>
            <CardDescription>
              {FUENTE_POR_CATEGORIA[cat] ?? ""} Haz clic en el símbolo de información de cada valor para ver el
              detalle completo: de dónde se obtuvo y qué afecta.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
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
                      <span className="text-sm font-medium inline-flex items-center">
                        {nombreLegible(p.key)}
                        <ParameterManualSheet parameterKey={p.key} />
                      </span>
                      {p.notes && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{p.notes}</p>}
                    </TableCell>
                    <TableCell className="text-right font-medium whitespace-nowrap">
                      {legible.valor === "tabla"
                        ? <Badge variant="outline" className="text-xs">tabla</Badge>
                        : legible.valor}
                    </TableCell>
                    <TableCell><Badge variant="secondary" className="text-xs font-normal">{legible.unidad}</Badge></TableCell>
                    <TableCell className="text-xs max-w-xs">
                      {fuenteLegible(p.source)}
                      {p.sourceUrl && (
                        <a href={p.sourceUrl} target="_blank" rel="noopener noreferrer" className="block text-primary hover:underline mt-0.5">
                          Ver la publicación oficial
                        </a>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">{p.effectiveFrom.toLocaleDateString("es-MX")}</TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}

      <Card className="bg-muted/30">
        <CardContent className="py-4 text-sm text-muted-foreground">
          Estos valores alimentan el cálculo, pero cada estimación guarda además una copia de los valores con
          los que se hizo, para que un número emitido hace meses se pueda auditar tal como se generó. Las
          estimaciones son preliminares: la determinación oficial fiscal y laboral requiere revisión
          profesional contable, fiscal y legal.
        </CardContent>
      </Card>
    </div>
  );
}
