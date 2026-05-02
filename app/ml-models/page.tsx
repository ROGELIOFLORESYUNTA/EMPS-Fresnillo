import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { BrainCircuit } from "lucide-react";

export default async function MLModelsPage() {
  const [models, trainingCases, predictions] = await Promise.all([
    prisma.mLModelRegistry.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: {
        _count: { select: { metrics: true, predictions: true } },
        metrics: { take: 10, orderBy: { createdAt: "desc" } },
      },
    }),
    prisma.trainingCase.groupBy({ by: ["sourceKind", "devModeCode"], _count: true }),
    prisma.mLPrediction.count(),
  ]);

  const totalCases = trainingCases.reduce((a, b) => a + b._count, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><BrainCircuit className="w-6 h-6" />Modelos ML</h1>
        <p className="text-muted-foreground">
          {models.length} modelos registrados · {totalCases} casos de entrenamiento · {predictions} predicciones generadas
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Modelos del sistema</CardTitle>
          <CardDescription>4 modelos planeados (addendum 21): effort_range_model, change_risk_model, cost_deviation_model, mode_factor_model.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {models.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <BrainCircuit className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No hay modelos registrados todavía.</p>
              <p className="text-sm mt-2">El sistema empieza con reglas y fórmulas explicables (Fase 0). Los modelos ML se entrenan cuando exista suficiente dataset local.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Model key</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Variable objetivo</TableHead>
                  <TableHead>Algoritmo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-center">Métricas</TableHead>
                  <TableHead className="text-center">Predicciones</TableHead>
                  <TableHead>Aprobado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {models.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-mono text-xs">{m.modelKey}</TableCell>
                    <TableCell className="font-medium">{m.modelName}</TableCell>
                    <TableCell><Badge variant="outline">{m.targetVariable}</Badge></TableCell>
                    <TableCell><Badge variant="secondary">{m.algorithm}</Badge></TableCell>
                    <TableCell>
                      <Badge variant={
                        m.status === "approved" ? "success" :
                        m.status === "trained" ? "warning" :
                        m.status === "retired" ? "destructive" :
                        "outline"
                      }>{m.status}</Badge>
                    </TableCell>
                    <TableCell className="text-center">{m._count.metrics}</TableCell>
                    <TableCell className="text-center">{m._count.predictions}</TableCell>
                    <TableCell className="text-xs">{m.approvedAt ? m.approvedAt.toISOString().split("T")[0] : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Casos de entrenamiento por origen y modo</CardTitle>
          <CardDescription>Origen del dato + modo de desarrollo para entrenar modelos por modo.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {trainingCases.length === 0 ? (
            <p className="p-6 text-center text-muted-foreground">No hay casos. Captura proyectos reales y registra resultados para alimentar el modelo.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Origen</TableHead>
                  <TableHead>Modo de desarrollo</TableHead>
                  <TableHead className="text-right">Casos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trainingCases.map((g, i) => (
                  <TableRow key={i}>
                    <TableCell><Badge variant="outline">{g.sourceKind}</Badge></TableCell>
                    <TableCell>{g.devModeCode ?? <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell className="text-right font-medium">{g._count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pipeline de aprendizaje (addendum 21)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 rounded border bg-muted/30">
              <Badge variant="outline" className="mb-2">Fase 0</Badge>
              <p className="font-medium mb-1">Fórmulas y reglas base</p>
              <p className="text-muted-foreground text-xs">Cálculo determinístico con coeficientes por modo y reglas explicitas. Sin ML.</p>
              <Badge variant="success" className="mt-2">Activa</Badge>
            </div>
            <div className="p-3 rounded border bg-muted/30">
              <Badge variant="outline" className="mb-2">Fase 1</Badge>
              <p className="font-medium mb-1">Importación de datasets públicos</p>
              <p className="text-muted-foreground text-xs">Importar Public Jira, JOSSE y SEERA para calibración.</p>
              <Badge variant="outline" className="mt-2">Pendiente</Badge>
            </div>
            <div className="p-3 rounded border bg-muted/30">
              <Badge variant="outline" className="mb-2">Fase 2</Badge>
              <p className="font-medium mb-1">Dataset local del sistema</p>
              <p className="text-muted-foreground text-xs">Captura de casos reales con resultado final para entrenamiento.</p>
              <Badge variant="outline" className="mt-2">Pendiente</Badge>
            </div>
            <div className="p-3 rounded border bg-muted/30">
              <Badge variant="outline" className="mb-2">Fase 3</Badge>
              <p className="font-medium mb-1">Modelo ML experimental</p>
              <p className="text-muted-foreground text-xs">Regresión, random forest o gradient boosting según volumen de datos.</p>
              <Badge variant="outline" className="mt-2">Pendiente</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
