import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Activity, ExternalLink, AlertTriangle } from "lucide-react";

export default async function LiveSourcesPage() {
  const [sources, pendingReviews, fiscalVersions] = await Promise.all([
    prisma.liveSourceRegistry.findMany({
      orderBy: [{ category: "asc" }, { sourceKey: "asc" }],
      include: { _count: { select: { snapshots: true } } },
    }),
    prisma.parameterChangeReview.findMany({
      where: { decision: "pending" },
      orderBy: { detectedAt: "desc" },
    }),
    prisma.fiscalParameterVersion.findMany({
      where: { approvalStatus: "approved" },
      orderBy: [{ parameterKey: "asc" }, { validFrom: "desc" }],
    }),
  ]);

  const grouped: Record<string, typeof sources> = {};
  for (const s of sources) (grouped[s.category] ??= []).push(s);

  const categoryLabels: Record<string, string> = {
    fiscal: "Federales (SAT)",
    fiscal_state: "Estatales (Zacatecas)",
    labor: "Laborales (INEGI/CONASAMI)",
    dataset: "Datasets de investigación (Zenodo)",
    procurement: "Contratación pública",
    research: "Investigación",
    technology: "Tecnología",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Activity className="w-6 h-6" />Fuentes vivas</h1>
        <p className="text-muted-foreground">
          {sources.length} fuentes registradas · {fiscalVersions.length} parámetros fiscales aprobados · {pendingReviews.length} revisiones pendientes
        </p>
      </div>

      {pendingReviews.length > 0 && (
        <Card className="border-orange-300 bg-orange-50/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-orange-600" />Revisiones pendientes</CardTitle>
            <CardDescription>Cambios detectados en fuentes oficiales que requieren aprobación humana.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Parámetro</TableHead>
                  <TableHead>Valor actual</TableHead>
                  <TableHead>Valor nuevo</TableHead>
                  <TableHead>Riesgo</TableHead>
                  <TableHead>Detectado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingReviews.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.parameterKey}</TableCell>
                    <TableCell>{r.oldValue ?? "—"}</TableCell>
                    <TableCell className="font-medium">{r.newValue ?? "—"}</TableCell>
                    <TableCell><Badge variant={r.riskLevel === "critical" ? "destructive" : r.riskLevel === "high" ? "warning" : "outline"}>{r.riskLevel}</Badge></TableCell>
                    <TableCell className="text-xs">{r.detectedAt.toISOString().split("T")[0]}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {Object.entries(grouped).map(([cat, items]) => (
        <Card key={cat}>
          <CardHeader>
            <CardTitle className="text-base">{categoryLabels[cat] ?? cat}</CardTitle>
            <CardDescription>{items.length} fuentes en esta categoría</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source key</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Frecuencia</TableHead>
                  <TableHead>Parser</TableHead>
                  <TableHead className="text-center">Snapshots</TableHead>
                  <TableHead>Aprobación humana</TableHead>
                  <TableHead>URL</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs">{s.sourceKey}</TableCell>
                    <TableCell className="font-medium">{s.sourceName}</TableCell>
                    <TableCell><Badge variant="outline">{s.refreshFrequency}</Badge></TableCell>
                    <TableCell><Badge variant="secondary">{s.parserType}</Badge></TableCell>
                    <TableCell className="text-center">{s._count.snapshots}</TableCell>
                    <TableCell>{s.requiresHumanApproval ? <Badge variant="warning">Sí</Badge> : <Badge>No</Badge>}</TableCell>
                    <TableCell>
                      <a href={s.sourceUrl} target="_blank" rel="noopener" className="text-primary hover:underline text-xs flex items-center gap-1">
                        Abrir <ExternalLink className="w-3 h-3" />
                      </a>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Parámetros fiscales aprobados</CardTitle>
          <CardDescription>Versiones validadas por revisión humana (Fase A - validación oficial 2026-05-01).</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Parámetro</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Unidad</TableHead>
                <TableHead>Vigencia</TableHead>
                <TableHead>Aprobado por</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fiscalVersions.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-mono text-xs">{v.parameterKey}</TableCell>
                  <TableCell className="text-right font-medium">{v.valueNumeric ? Number(v.valueNumeric).toString() : v.valueText}</TableCell>
                  <TableCell><Badge variant="secondary">{v.unit}</Badge></TableCell>
                  <TableCell className="text-xs">{v.validFrom?.toISOString().split("T")[0]}</TableCell>
                  <TableCell className="text-xs">{v.approvedBy}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
