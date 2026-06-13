import { redirect } from "next/navigation";
import Link from "next/link";
import { isAdmin } from "@/lib/admin-auth";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Beaker, BookOpenCheck, Download } from "lucide-react";
import { ValidacionRunner } from "./runner-client";

export const metadata = { title: "Validación de la hipótesis" };

export default async function ValidacionHipotesisPage() {
  if (!(await isAdmin())) redirect("/admin-login");
  return (
    <div className="space-y-6">
      <Breadcrumbs items={[
        { label: "Investigación", href: "/investigacion" },
        { label: "Validación de la hipótesis" },
      ]} />

      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Beaker className="w-6 h-6 text-purple-600" />
            Validación empírica de la hipótesis
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
            Corre el motor de análisis estadístico + ML dentro del propio sistema y obtén un veredicto automático
            sobre si los datos respaldan la hipótesis de la tesis. Incluye regresión multivariable, random forest
            y red neuronal MLP. Métricas equivalentes a las de scikit-learn (puedes verificarlo con el notebook
            Python anexo).
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/investigacion/metodologia">
              <BookOpenCheck className="w-4 h-4 mr-2" />
              Metodología
            </Link>
          </Button>
          <Button asChild variant="outline">
            <a href="/api/research/dataset?format=csv" download>
              <Download className="w-4 h-4 mr-2" />
              Dataset CSV
            </a>
          </Button>
          <Button asChild variant="outline">
            <a href="/api/research/analysis/report?format=csv" download>
              <Download className="w-4 h-4 mr-2" />
              Reporte de métricas
            </a>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Hipótesis a validar</CardTitle>
          <CardDescription>
            Una estimación temprana mejora cuando integra esfuerzo técnico, modo de desarrollo, cambios y
            viabilidad fiscal-laboral antes de comprometer precio, calendario y mantenimiento.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm">
            <strong>Variable dependiente:</strong> MAPE de horas (% de error absoluto vs el resultado real).{" "}
            <strong>Umbral IFPUG:</strong> ≤15% = preciso, 15-30% = aceptable, &gt;30% = impreciso.
          </p>
          <p className="text-sm mt-2">
            <strong>Veredicto automático:</strong> R² ≥ 0.35 con ≥2 predictores significativos →{" "}
            <em>cumplida</em>. R² entre 0.15–0.35 → <em>parcialmente cumplida</em>. R² &lt; 0.15 →{" "}
            <em>no cumplida</em>. N &lt; 15 → <em>datos insuficientes</em>.
          </p>
        </CardContent>
      </Card>

      <ValidacionRunner />
    </div>
  );
}
