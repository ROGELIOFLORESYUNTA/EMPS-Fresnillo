import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { formatMXN, RISK_LEVELS } from "@/lib/utils";
import { Download, FileBarChart, Filter } from "lucide-react";

export const metadata = {
  title: "Exportar evidencia de cambios — Investigación",
};

export default async function ExportarCambiosPage() {
  const changes = await prisma.changeRequest.findMany({
    include: {
      project: { select: { id: true, name: true, client: true } },
      assessment: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const withAssessment = changes.filter((c) => c.assessment);

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[
        { label: "Investigación", href: "/investigacion" },
        { label: "Exportar evidencia de cambios" },
      ]} />

      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileBarChart className="w-6 h-6" />
            Exportar evidencia de cambios
          </h1>
          <p className="text-muted-foreground max-w-3xl mt-1">
            Descarga todas las evaluaciones de impacto de cambios (motor v7) en JSON o CSV. Útil para el anexo del artículo, validación científica o análisis externo.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <a href="/api/changes/export?format=json" download>
              <Download className="w-4 h-4 mr-2" />Descargar JSON
            </a>
          </Button>
          <Button asChild variant="outline">
            <a href="/api/changes/export?format=csv" download>
              <Download className="w-4 h-4 mr-2" />Descargar CSV
            </a>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="w-4 h-4" />Filtrar por proyecto
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Cada link descarga solo los cambios de ese proyecto.
          </p>
        </CardHeader>
        <CardContent className="text-sm flex flex-wrap gap-3">
          {Array.from(new Map(changes.map((c) => [c.project.id, c.project])).values()).map((p) => (
            <div key={p.id} className="border rounded-md px-3 py-2 flex items-center gap-3">
              <span className="font-medium">{p.name}</span>
              <Link className="text-xs text-primary hover:underline" href={`/api/changes/export?format=json&projectId=${p.id}`} target="_blank">JSON</Link>
              <Link className="text-xs text-primary hover:underline" href={`/api/changes/export?format=csv&projectId=${p.id}`} target="_blank">CSV</Link>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Evaluaciones registradas ({withAssessment.length} de {changes.length} cambios)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {withAssessment.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-sm">
              <p>Aún no hay cambios con evaluación de impacto v7.</p>
              <p className="text-xs mt-2">Cuando se evalúe un cambio desde el wizard, aparecerá aquí.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Proyecto</TableHead>
                  <TableHead>Cambio</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Riesgo</TableHead>
                  <TableHead className="text-right">Costo</TableHead>
                  <TableHead>Decisión</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {withAssessment.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-xs">{c.createdAt.toLocaleDateString("es-MX")}</TableCell>
                    <TableCell className="text-xs">{c.project.name}</TableCell>
                    <TableCell className="text-xs max-w-md truncate" title={c.clientOriginalText ?? c.description}>
                      {c.clientOriginalText ?? c.description}
                    </TableCell>
                    <TableCell><Badge variant="outline">{c.assessment?.suggestedType}</Badge></TableCell>
                    <TableCell><Badge className={RISK_LEVELS[c.assessment?.riskLevel as keyof typeof RISK_LEVELS]?.bg ?? ""} variant="outline">{c.assessment?.riskLevel}</Badge></TableCell>
                    <TableCell className="text-right">{c.assessment?.estimatedCost ? formatMXN(Number(c.assessment.estimatedCost)) : "—"}</TableCell>
                    <TableCell><Badge variant={c.decision === "aceptado" || c.decision === "incluido" ? "success" : c.decision === "rechazado" ? "destructive" : "outline"}>{c.decision}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
