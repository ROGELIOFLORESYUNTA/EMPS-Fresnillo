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

const CATEGORIAS: Record<string, string> = {
  IMSS: "Cuotas IMSS por ramo",
  UMA: "Unidad de Medida y Actualización",
  SALARIO: "Salarios mínimos",
  LFT: "Prestaciones Ley Federal del Trabajo",
  ZAC: "Estado de Zacatecas",
  INFONAVIT: "INFONAVIT",
  FED: "Federales (IVA, ISR)",
  MODO: "Modos de desarrollo",
  CHANGE: "Motor de control de cambios (v7)",
  OTROS: "Otros",
};

function categorizar(key: string): keyof typeof CATEGORIAS {
  if (key.startsWith("CHANGE_")) return "CHANGE";
  if (key.startsWith("IMSS_")) return "IMSS";
  if (key.startsWith("UMA_")) return "UMA";
  if (key.startsWith("SALARIO_")) return "SALARIO";
  if (key.startsWith("LFT_")) return "LFT";
  if (key === "ISN_ZACATECAS" || key === "IMPUESTO_UAZ") return "ZAC";
  if (key === "INFONAVIT_PATRON") return "INFONAVIT";
  if (key === "IVA_GENERAL" || key === "ISR_PERSONA_MORAL") return "FED";
  if (key.startsWith("DEV_MODE") || key === "SCENARIO_FACTORS" || key === "DEFAULT_CARGA_PATRONAL_ESTIMADA") return "MODO";
  return "OTROS";
}

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

  const ahora = new Date();

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
      </div>

      <Card className="border-blue-200 bg-blue-50/40">
        <CardContent className="py-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium mb-1 text-blue-950">Tus cambios son privados — no afectan a otros visitantes</p>
            <p className="text-blue-900">
              Cada visitante del sitio tiene <strong>su propia copia</strong> de los parámetros. Si tú cambias el IVA aquí, solo TÚ ves ese cambio en TUS estimaciones futuras. Los demás siguen con el valor original. <strong className="text-foreground">Tus estimaciones anteriores tampoco cambian</strong> — el sistema guarda el valor que se usó en cada cálculo. Para usar tus valores nuevos en un proyecto ya estimado, ábrelo y presiona &ldquo;Recalcular con parámetros vigentes&rdquo;.
            </p>
          </div>
        </CardContent>
      </Card>

      {Object.entries(grupos).map(([cat, items]) => (
        <Card key={cat}>
          <CardHeader>
            <CardTitle className="text-base">{CATEGORIAS[cat] ?? cat}</CardTitle>
            <CardDescription>{items.length} parámetros en esta categoría</CardDescription>
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
                        <p className="font-mono text-xs inline-flex items-center">
                          {p.key}
                          <ParameterManualSheet parameterKey={p.key} />
                        </p>
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
