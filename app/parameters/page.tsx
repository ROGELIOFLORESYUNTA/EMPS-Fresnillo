import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

export default async function ParametersPage() {
  const [parameters, fiscalVersions, liveSources] = await Promise.all([
    prisma.parameter.findMany({ orderBy: [{ year: "desc" }, { key: "asc" }] }),
    prisma.fiscalParameterVersion.findMany({
      where: { approvalStatus: "approved" },
      orderBy: [{ parameterKey: "asc" }, { validFrom: "desc" }],
    }),
    prisma.liveSourceRegistry.findMany({ where: { active: true }, orderBy: { sourceKey: "asc" } }),
  ]);

  // agrupar parametros por categoria/prefijo
  const groups: Record<string, typeof parameters> = {};
  for (const p of parameters) {
    const cat = p.key.startsWith("IMSS_") ? "IMSS" :
      p.key.startsWith("UMA_") ? "UMA" :
      p.key.startsWith("SALARIO_") ? "Salarios mínimos" :
      p.key.startsWith("LFT_") ? "LFT (prestaciones)" :
      p.key.startsWith("DEV_MODE_") ? "Modos de desarrollo" :
      p.key === "ISN_ZACATECAS" || p.key === "IMPUESTO_UAZ" ? "Zacatecas" :
      p.key === "INFONAVIT_PATRON" ? "INFONAVIT" :
      p.key === "IVA_GENERAL" || p.key === "ISR_PERSONA_MORAL" ? "Federales" :
      "Otros";
    (groups[cat] ??= []).push(p);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Parámetros 2026</h1>
        <p className="text-muted-foreground">{parameters.length} parámetros sembrados · {fiscalVersions.length} versiones fiscales aprobadas · {liveSources.length} fuentes vivas activas</p>
      </div>

      {Object.entries(groups).map(([cat, items]) => (
        <Card key={cat}>
          <CardHeader>
            <CardTitle className="text-base">{cat}</CardTitle>
            <CardDescription>{items.length} parámetros</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Clave</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Unidad</TableHead>
                  <TableHead>Vigencia</TableHead>
                  <TableHead>Fuente</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.key}</TableCell>
                    <TableCell className="text-right font-medium">
                      {p.unit === "json" || p.unit === "table" ? <Badge variant="outline">JSON</Badge> : p.value}
                    </TableCell>
                    <TableCell><Badge variant="secondary">{p.unit}</Badge></TableCell>
                    <TableCell className="text-xs">{p.effectiveFrom.toISOString().split("T")[0]}</TableCell>
                    <TableCell className="max-w-md text-xs">
                      {p.sourceUrl ? (
                        <a href={p.sourceUrl} target="_blank" rel="noopener" className="text-primary hover:underline">
                          {p.source}
                        </a>
                      ) : p.source}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
