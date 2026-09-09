import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Plus, Upload, Pencil, AlertCircle } from "lucide-react";
import { ClearCacheButton } from "./clear-cache-button";
import { ParameterManualSheet } from "@/components/parameter-manual-sheet";
import { getCurrentWorkspaceId } from "@/lib/workspace";
import { isAdmin } from "@/lib/admin-auth";
import { CATEGORIAS, ORDEN_CATEGORIAS, categorizar, nombreLegible } from "@/lib/parameter-labels";

export default async function AdminParametrosPage() {
  const parameters = await prisma.parameter.findMany({
    orderBy: [{ year: "desc" }, { key: "asc" }],
  });

  // FASE G.I: traer overrides del workspace actual y mapear por parameterKey
  const workspaceId = await getCurrentWorkspaceId();
  const overrides = workspaceId
    ? await prisma.workspaceParameterOverride.findMany({ where: { workspaceId } })
    : [];
  const overrideMap = new Map(overrides.map((o) => [o.parameterKey, o]));

  const grupos: Record<string, typeof parameters> = {};
  for (const p of parameters) {
    const cat = categorizar(p.key);
    (grupos[cat] ??= []).push(p);
  }
  // Mismo orden que la pantalla publica de fuentes.
  const gruposOrdenados = Object.entries(grupos).sort(
    ([a], [b]) => ORDEN_CATEGORIAS.indexOf(a) - ORDEN_CATEGORIAS.indexOf(b),
  );

  const ahora = new Date();
  // Las acciones que afectan a todos los visitantes (sembrar un año, calibrar
  // el motor) solo se le muestran al investigador. Ajustar un valor para las
  // estimaciones propias sigue disponible para cualquiera.
  const esInvestigador = await isAdmin();

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Editar parámetros" }]} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Editor de parámetros</h1>
          <p className="text-muted-foreground text-sm">
            {parameters.length} parámetros registrados. Edita o agrega nuevos cuando salgan reformas o cambie el ejercicio fiscal.
          </p>
        </div>
        {esInvestigador && (
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" asChild>
              <Link href="/admin/calibracion"><Pencil className="w-4 h-4 mr-2" />Calibrar motor (5 modos)</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/admin/parametros/cargar-anio"><Upload className="w-4 h-4 mr-2" />Cargar año completo</Link>
            </Button>
            <Button asChild>
              <Link href="/admin/parametros/nuevo"><Plus className="w-4 h-4 mr-2" />Nuevo parámetro</Link>
            </Button>
            <ClearCacheButton />
          </div>
        )}
      </div>

      <Card className="border-blue-200 bg-blue-50/40">
        <CardContent className="py-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium mb-1 text-blue-950">Tus cambios son privados: no afectan a otros visitantes</p>
            <p className="text-blue-900">
              Cada visitante del sitio tiene <strong>su propia copia</strong> de los parámetros. Si tú cambias el IVA aquí, solo TÚ ves ese cambio en TUS estimaciones futuras. Los demás siguen con el valor original. <strong className="text-foreground">Tus estimaciones anteriores tampoco cambian</strong>. El sistema guarda el valor que se usó en cada cálculo. Para usar tus valores nuevos en un proyecto ya estimado, ábrelo y presiona &ldquo;Recalcular con parámetros vigentes&rdquo;.
            </p>
          </div>
        </CardContent>
      </Card>

      {gruposOrdenados.map(([cat, items]) => (
        <Card key={cat}>
          <CardHeader>
            <CardTitle className="text-base">{CATEGORIAS[cat] ?? cat}</CardTitle>
            <CardDescription>
              {items.length} parámetros · haz clic en el símbolo ⓘ de cada uno para ver su manual: qué es, de dónde sale el valor y qué pasa si lo cambias
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Clave</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Unidad</TableHead>
                  <TableHead>Vigencia</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((p) => {
                  const vencido = p.effectiveUntil && p.effectiveUntil < ahora;
                  const override = overrideMap.get(p.key);
                  const effectiveValue = override?.value ?? p.value;
                  return (
                    <TableRow key={p.id} className={override ? "bg-blue-50/40" : ""}>
                      <TableCell>
                        <span className="text-sm font-medium inline-flex items-center">
                          {nombreLegible(p.key)}
                          <ParameterManualSheet parameterKey={p.key} />
                        </span>
                        <p className="font-mono text-[10px] text-muted-foreground">{p.key}</p>
                        {p.notes && <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{p.notes}</p>}
                        {override && (
                          <Badge variant="outline" className="text-[10px] text-blue-700 border-blue-300 mt-1">
                            Editado por ti
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {p.unit === "json" || p.unit === "table" ? (
                          <Badge variant="outline" className="text-xs">JSON</Badge>
                        ) : (
                          <span className="font-medium">{effectiveValue ?? "—"}</span>
                        )}
                        {override && p.value !== override.value && (
                          <div className="text-[10px] text-muted-foreground line-through">{p.value ?? "—"}</div>
                        )}
                      </TableCell>
                      <TableCell><Badge variant="secondary" className="text-xs">{p.unit}</Badge></TableCell>
                      <TableCell className="text-xs">
                        Desde {p.effectiveFrom.toISOString().split("T")[0]}
                        {p.effectiveUntil && (
                          <><br />Hasta {p.effectiveUntil.toISOString().split("T")[0]}</>
                        )}
                      </TableCell>
                      <TableCell>
                        {vencido ? (
                          <Badge variant="destructive">Vencido</Badge>
                        ) : (
                          <Badge variant="success">Vigente</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/admin/parametros/${p.id}/editar`}>
                            <Pencil className="w-4 h-4 mr-1" />Editar
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
