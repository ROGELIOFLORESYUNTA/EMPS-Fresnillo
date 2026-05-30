import { redirect } from "next/navigation";
import Link from "next/link";
import { isAdmin } from "@/lib/admin-auth";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpenCheck, Play, ExternalLink } from "lucide-react";

export const metadata = { title: "Metodología de validación" };

const ROLES = {
  cumplida: "R² ≥ 0.35 Y al menos 2 predictores con p < 0.05",
  parcialmente_cumplida: "R² entre 0.15 y 0.35, O solo 1 predictor significativo",
  no_cumplida: "R² < 0.15 Y ningún predictor significativo",
  datos_insuficientes: "N < 15 proyectos con resultado real capturado",
};

export default async function MetodologiaPage() {
  if (!(await isAdmin())) redirect("/admin-login");
  return (
    <div className="space-y-6 max-w-4xl">
      <Breadcrumbs items={[
        { label: "Investigación", href: "/investigacion" },
        { label: "Metodología" },
      ]} />

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpenCheck className="w-6 h-6 text-blue-600" />
            Metodología de validación
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Cómo se operacionaliza y prueba la hipótesis de la tesis dentro del propio sistema.
          </p>
        </div>
        <Button asChild>
          <Link href="/investigacion/validacion-hipotesis">
            <Play className="w-4 h-4 mr-2" />
            Correr validación
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">1. Hipótesis</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <blockquote className="border-l-4 border-blue-500 pl-4 italic">
            Una estimación temprana mejora cuando integra esfuerzo técnico, modo de desarrollo, cambios y
            viabilidad fiscal-laboral antes de comprometer precio, calendario y mantenimiento.
          </blockquote>
          <p>
            <strong>Operacionalización:</strong> "mejora" se mide como menor error en horas estimadas vs reales
            (MAPE). "Integrar las 4 dimensiones" se traduce a 4 grupos de variables independientes.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">2. Variable dependiente</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><strong>MAPE de horas:</strong> mean(|estimado − real| / real × 100).</p>
          <p>Umbrales estándar IFPUG:</p>
          <ul className="list-disc list-inside ml-2">
            <li>≤ 15% = estimación <strong>precisa</strong></li>
            <li>15-30% = estimación <strong>aceptable</strong></li>
            <li>&gt; 30% = estimación <strong>imprecisa</strong></li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">3. Variables independientes (las 4 dimensiones)</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <p className="font-semibold">VI 1 — Esfuerzo técnico integrado</p>
            <p className="text-muted-foreground">Features: clarity_avg, n_modules, n_integrations, criticality_avg.</p>
          </div>
          <div>
            <p className="font-semibold">VI 2 — Modo de desarrollo declarado</p>
            <p className="text-muted-foreground">Feature: dev_mode (one-hot encoding de traditional / ai_assisted / hybrid / bytecoding_prompts / low_code).</p>
          </div>
          <div>
            <p className="font-semibold">VI 3 — Cambios anticipados</p>
            <p className="text-muted-foreground">Feature: changes_anticipated_ratio = cantidad de cambios capturados antes / cambios reales.</p>
          </div>
          <div>
            <p className="font-semibold">VI 4 — Viabilidad fiscal-laboral capturada</p>
            <p className="text-muted-foreground">Feature: fiscal_detailed (booleano: detailed = se desglosó IMSS/INFONAVIT/ISN; estimated = factor agregado).</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">4. Regla de decisión (veredicto automático)</CardTitle></CardHeader>
        <CardContent>
          <table className="text-sm w-full">
            <thead><tr className="border-b"><th className="text-left py-1">Veredicto</th><th className="text-left py-1">Condición</th></tr></thead>
            <tbody>
              {Object.entries(ROLES).map(([k, v]) => (
                <tr key={k} className="border-b">
                  <td className="py-2 font-semibold">{k.replace(/_/g, " ")}</td>
                  <td className="py-2">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">5. Métodos estadísticos aplicados</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <p className="font-semibold">Estadística descriptiva</p>
            <p className="text-muted-foreground">Media, mediana, desviación estándar y cuartiles del MAPE. Da una primera lectura sobre la magnitud del error.</p>
          </div>
          <div>
            <p className="font-semibold">Correlación de Pearson (con p-value aproximado)</p>
            <p className="text-muted-foreground">Identifica qué features individuales se asocian con menor MAPE. Significancia: p &lt; 0.05.</p>
          </div>
          <div>
            <p className="font-semibold">Regresión multivariable lineal — EVIDENCIA PRINCIPAL</p>
            <p className="text-muted-foreground">Mide qué fracción de la varianza del MAPE se explica conjuntamente por las 4 VI (R²) y qué coeficientes son significativos.</p>
          </div>
          <div>
            <p className="font-semibold">Random Forest (clasificación binaria)</p>
            <p className="text-muted-foreground">Entrena un bosque aleatorio para predecir si una estimación caerá dentro del umbral del 15%. Reporta feature importance robusto a no-linealidades.</p>
          </div>
          <div>
            <p className="font-semibold">Red neuronal MLP (1 capa oculta) — EXHIBICIÓN, NO EVIDENCIA</p>
            <p className="text-muted-foreground">Sirve para mostrar predicción no-lineal. <strong>No es evidencia principal del artículo</strong> porque con N&lt;100 hay alto riesgo de sobreajuste. Reportarla solo como complemento.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">6. Validación externa (Python opcional)</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>Para reproducir el mismo análisis en Python (scikit-learn) y verificar que los números coinciden:</p>
          <ol className="list-decimal list-inside ml-2 space-y-1">
            <li>Descargar el CSV desde <Link href="/investigacion/validacion-hipotesis" className="text-blue-700 hover:underline">/validacion-hipotesis</Link> (botón "Descargar CSV").</li>
            <li>Instalar dependencias: <code className="bg-muted px-1 rounded">pip install pandas scikit-learn matplotlib jupyter</code>.</li>
            <li>Abrir <code className="bg-muted px-1 rounded">entregable-investigacion/notebooks/validar_hipotesis.ipynb</code>.</li>
            <li>Apuntar al CSV descargado y ejecutar todas las celdas.</li>
            <li>R², MAPE y feature importance deben coincidir con los del sistema (±0.01).</li>
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">7. Referencias</CardTitle></CardHeader>
        <CardContent>
          <ul className="text-sm space-y-1 list-disc list-inside ml-2">
            <li>IFPUG (2010). Function Point Counting Practices Manual v4.3.</li>
            <li>Boehm, B. (1981). Software Engineering Economics. Prentice-Hall.</li>
            <li>Conte, Dunsmore &amp; Shen (1986). Software Engineering Metrics and Models.</li>
            <li>Jørgensen &amp; Shepperd (2007). A systematic review of software development cost estimation studies. <em>IEEE TSE</em>.</li>
            <li>PMBOK 7th Edition (2021). Project Management Body of Knowledge.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
