"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { apiPost } from "@/lib/api-client";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ChevronLeft, Upload, AlertCircle, CheckCircle2 } from "lucide-react";

const PLANTILLA_2027 = `{
  "year": 2027,
  "country": "Mexico",
  "state": "Zacatecas",
  "parameters": [
    {
      "key": "IVA_GENERAL",
      "value": 0.16,
      "unit": "rate",
      "source": "LIVA Articulo 1 (vigente 2027)",
      "source_url": "https://www.diputados.gob.mx/LeyesBiblio/pdf/LIVA.pdf",
      "effective_from": "2027-01-01",
      "notes": "Sin reformas para 2027."
    }
  ]
}`;

export default function CargarAnioPage() {
  const router = useRouter();
  const [json, setJson] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ created: number; updated: number; total: number } | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      const parsed = JSON.parse(json);
      const result = await apiPost<{ created: number; updated: number; total: number }>("/api/parameters/cargar-anio", parsed);
      setSuccess(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "JSON inválido o error de servidor");
    } finally {
      setSaving(false);
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setJson(text);
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Breadcrumbs items={[
        { label: "Editar parámetros", href: "/admin/parametros" },
        { label: "Cargar año completo" },
      ]} />

      <div>
        <h1 className="text-2xl font-bold">Carga masiva por año</h1>
        <p className="text-sm text-muted-foreground">
          Subir un archivo JSON con los parámetros de un año fiscal completo (ej. 2027).
          La estructura debe ser idéntica a <code className="bg-muted px-1 rounded text-xs">17_seed_data_parametros_2026.json</code>.
        </p>
      </div>

      <form onSubmit={handleUpload}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cargar archivo JSON</CardTitle>
            <CardDescription>
              Pegar el JSON o seleccionar un archivo. El sistema crea los parámetros nuevos y actualiza los que coincidan en (año + estado + clave + vigencia desde).
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="file">Seleccionar archivo</Label>
              <input
                id="file"
                type="file"
                accept="application/json,.json"
                onChange={handleFile}
                className="text-sm file:mr-3 file:px-3 file:py-1 file:rounded-md file:border file:border-input file:bg-background file:text-sm file:cursor-pointer"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="json">o pegar el JSON aquí</Label>
              <Textarea
                id="json"
                rows={14}
                className="font-mono text-xs"
                value={json}
                onChange={(e) => setJson(e.target.value)}
                placeholder={PLANTILLA_2027}
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            {success && (
              <div className="flex items-start gap-2 p-3 rounded-md bg-green-50 text-green-800 text-sm">
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">Carga completada</p>
                  <p>{success.created} parámetros creados · {success.updated} actualizados · total {success.total}</p>
                  <Button size="sm" variant="outline" onClick={() => router.push("/admin/parametros")} className="mt-2">
                    Ver editor
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 mt-4">
          <Button type="button" variant="outline" asChild>
            <Link href="/admin/parametros">Cancelar</Link>
          </Button>
          <Button type="submit" disabled={saving || !json.trim()}>
            <Upload className="w-4 h-4 mr-2" />
            {saving ? "Cargando…" : "Cargar parámetros"}
          </Button>
        </div>
      </form>
    </div>
  );
}
