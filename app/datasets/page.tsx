import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Database, ExternalLink } from "lucide-react";

export default async function DatasetsPage() {
  const datasets = await prisma.estimationDatasetSource.findMany({
    orderBy: { code: "asc" },
    include: {
      _count: { select: { imports: true } },
      imports: { orderBy: { importedAt: "desc" }, take: 1 },
    },
  });

  const trainingCases = await prisma.trainingCase.count();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Database className="w-6 h-6" />Datasets</h1>
        <p className="text-muted-foreground">
          Datasets registrados para calibrar el sistema (Public Jira, JOSSE, SEERA) y dataset local acumulativo.
          <br />
          Casos de entrenamiento: <Badge variant="secondary">{trainingCases}</Badge>
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datasets registrados</CardTitle>
          <CardDescription>Fuentes públicas y captura local. Addendum 19.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>DOI / URL</TableHead>
                <TableHead>Uso previsto</TableHead>
                <TableHead className="text-center">Importaciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {datasets.map((d) => (
                <TableRow key={d.id}>
                  <TableCell><Badge variant="outline" className="font-mono">{d.code}</Badge></TableCell>
                  <TableCell className="font-medium">{d.name}</TableCell>
                  <TableCell><Badge variant="secondary">{d.sourceType}</Badge></TableCell>
                  <TableCell className="max-w-xs">
                    {d.sourceUrl ? (
                      <a href={d.sourceUrl} target="_blank" rel="noopener" className="text-primary hover:underline text-xs flex items-center gap-1">
                        {d.doi ?? d.sourceUrl.replace(/^https?:\/\//, "")}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : <span className="text-muted-foreground text-xs">—</span>}
                  </TableCell>
                  <TableCell className="text-xs max-w-md">{d.intendedUse}</TableCell>
                  <TableCell className="text-center">{d._count.imports}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
