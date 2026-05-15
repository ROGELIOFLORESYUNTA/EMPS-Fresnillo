import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { TrendingUp } from "lucide-react";

export default async function ComparatorPage() {
  const [factors, modes] = await Promise.all([
    prisma.scenarioProductivityFactor.findMany({
      orderBy: [{ devModeCode: "asc" }, { scenarioName: "asc" }],
    }),
    prisma.devModeCatalog.findMany({ orderBy: { code: "asc" } }),
  ]);

  // Carga el JSON seed para mostrar también las distribuciones y velocidades
  const factorsParam = await prisma.parameter.findFirst({
    where: { key: "DEV_MODE_FACTORS" },
  });
  const velocityParam = await prisma.parameter.findFirst({
    where: { key: "DEV_MODE_VELOCITY" },
  });
  const distFactors = factorsParam?.value ? JSON.parse(factorsParam.value) : null;
  const velocity = velocityParam?.value ? JSON.parse(velocityParam.value) : null;
  const expectedSums = distFactors?._expected_sums ?? {};

  const orderedModes = ["traditional", "ai_assisted", "bytecoding_prompts", "low_code", "hybrid"];

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[
        { label: "Investigación", href: "/investigacion" },
        { label: "Comparador técnico" },
      ]} />
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><TrendingUp className="w-6 h-6" />Comparador de modos de desarrollo</h1>
        <p className="text-muted-foreground">Cómo el sistema modela cada uno de los 5 modos y por qué bytecoding puede sumar más horas-persona pero entregar prototipo mucho más rápido.</p>
      </div>

      {/* Distribución por fase */}
      {distFactors && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribución del esfuerzo por fase</CardTitle>
            <CardDescription>
              Multiplicadores sobre el esfuerzo técnico. Suma esperada = 1.0 excepto bytecoding (1.10). El hardening es trabajo adicional, no sustituto.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Modo</TableHead>
                  <TableHead className="text-right">Coding</TableHead>
                  <TableHead className="text-right">Review</TableHead>
                  <TableHead className="text-right">Testing</TableHead>
                  <TableHead className="text-right">Docs</TableHead>
                  <TableHead className="text-right">Deploy</TableHead>
                  <TableHead className="text-right">Mgmt/Hard.</TableHead>
                  <TableHead className="text-right">Suma</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orderedModes.map((m) => {
                  const f = distFactors[m];
                  if (!f) return null;
                  return (
                    <TableRow key={m}>
                      <TableCell><Badge variant="outline">{m}</Badge></TableCell>
                      <TableCell className="text-right font-mono">{f.coding}</TableCell>
                      <TableCell className="text-right font-mono">{f.review}</TableCell>
                      <TableCell className="text-right font-mono">{f.testing}</TableCell>
                      <TableCell className="text-right font-mono">{f.documentation}</TableCell>
                      <TableCell className="text-right font-mono">{f.deployment}</TableCell>
                      <TableCell className="text-right font-mono">{f.management ?? f.hardening} {f.hardening !== undefined ? "(hard)" : ""}</TableCell>
                      <TableCell className="text-right font-bold">{expectedSums[m]}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Velocity */}
      {velocity && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Velocidad calendario y aceleración a prototipo</CardTitle>
            <CardDescription>
              Modela el tiempo, no las horas-persona. Justifica por qué bytecoding/low-code aceleran el calendario aunque sumen más horas.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Modo</TableHead>
                  <TableHead className="text-right">velocity_factor</TableHead>
                  <TableHead className="text-right">prototype_speedup</TableHead>
                  <TableHead className="text-right">hardening_overhead</TableHead>
                  <TableHead className="text-right">prototype_quality</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orderedModes.map((m) => {
                  const v = velocity[m];
                  if (!v) return null;
                  return (
                    <TableRow key={m}>
                      <TableCell><Badge variant="outline">{m}</Badge></TableCell>
                      <TableCell className="text-right font-mono">{v.velocity_factor}×</TableCell>
                      <TableCell className="text-right font-mono">{v.prototype_speedup}×</TableCell>
                      <TableCell className="text-right font-mono">{(v.hardening_overhead * 100).toFixed(0)}%</TableCell>
                      <TableCell className="text-right font-mono">{v.prototype_quality_factor ? `${(v.prototype_quality_factor * 100).toFixed(0)}%` : "—"}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Factores per-fase del addendum */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Multiplicadores per-fase (Addendum 22)</CardTitle>
          <CardDescription>
            Modelo alternativo del addendum: cada modo tiene factores 0.0-2.0 multiplicando cada fase respecto al modo tradicional. Util para reportes.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Modo</TableHead>
                <TableHead className="text-right">Req</TableHead>
                <TableHead className="text-right">Coding</TableHead>
                <TableHead className="text-right">Review</TableHead>
                <TableHead className="text-right">Test</TableHead>
                <TableHead className="text-right">Refactor</TableHead>
                <TableHead className="text-right">Docs</TableHead>
                <TableHead className="text-right">Maint risk</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {factors.map((f) => (
                <TableRow key={f.id}>
                  <TableCell><Badge variant="outline">{f.devModeCode}</Badge></TableCell>
                  <TableCell className="text-right font-mono">{Number(f.requirementsFactor).toFixed(2)}</TableCell>
                  <TableCell className="text-right font-mono">{Number(f.codingFactor).toFixed(2)}</TableCell>
                  <TableCell className="text-right font-mono">{Number(f.reviewFactor).toFixed(2)}</TableCell>
                  <TableCell className="text-right font-mono">{Number(f.testingFactor).toFixed(2)}</TableCell>
                  <TableCell className="text-right font-mono">{Number(f.refactorFactor).toFixed(2)}</TableCell>
                  <TableCell className="text-right font-mono">{Number(f.documentationFactor).toFixed(2)}</TableCell>
                  <TableCell className="text-right font-mono">{Number(f.maintenanceRiskFactor).toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Catálogo de modos</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-3">
          {modes.map((m) => (
            <div key={m.id} className="p-3 rounded-md border">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline">{m.code}</Badge>
                <h3 className="font-semibold">{m.name}</h3>
              </div>
              <p className="text-sm text-muted-foreground">{m.description}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
