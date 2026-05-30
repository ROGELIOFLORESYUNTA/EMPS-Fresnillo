"use client";
import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api, apiPut, apiDelete } from "@/lib/api-client";
import { ChevronLeft, Save, Trash2, AlertCircle } from "lucide-react";
import { ParameterManualSheet } from "@/components/parameter-manual-sheet";

interface ParameterRow {
  id: string;
  year: number;
  country: string;
  state: string | null;
  key: string;
  value: string | null;
  unit: string;
  base: string | null;
  source: string;
  sourceUrl: string | null;
  effectiveFrom: string;
  effectiveUntil: string | null;
  notes: string | null;
}

export default function EditarParametroPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [param, setParam] = useState<ParameterRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api<{ parameter: ParameterRow }>(`/api/parameters/${id}`)
      .then((res) => setParam(res.parameter))
      .catch((e) => setError(e instanceof Error ? e.message : "Error al cargar"));
  }, [id]);

  if (error && !param) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center">
        <AlertCircle className="w-10 h-10 text-destructive mx-auto mb-3" />
        <p className="text-destructive">{error}</p>
        <Button variant="outline" asChild className="mt-4"><Link href="/admin/parametros">Regresar</Link></Button>
      </div>
    );
  }

  if (!param) return <div className="text-center py-12 text-muted-foreground">Cargando…</div>;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiPut(`/api/parameters/${id}`, {
        value: param!.value,
        unit: param!.unit,
        base: param!.base,
        source: param!.source,
        sourceUrl: param!.sourceUrl,
        notes: param!.notes,
      });
      router.push("/admin/parametros");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar");
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`¿Marcar el parámetro "${param!.key}" como vencido? Las estimaciones existentes no se afectan.`)) return;
    try {
      await apiDelete(`/api/parameters/${id}`);
      router.push("/admin/parametros");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al eliminar");
    }
  }

  const isJson = param.unit === "json" || param.unit === "table";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link href="/admin/parametros" className="text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="w-4 h-4 inline" /> Volver al editor
      </Link>

      <div>
        <Badge variant="outline" className="mb-2">{param.year} · {param.country}{param.state ? ` · ${param.state}` : ""}</Badge>
        <h1 className="text-2xl font-bold font-mono flex items-center gap-2">
          {param.key}
          <ParameterManualSheet parameterKey={param.key} />
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Haz clic en el ⓘ para ver el manual completo: cómo se obtuvo el valor actual, qué afecta y qué verificar antes de cambiarlo.
        </p>
      </div>

      <form onSubmit={handleSave}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Edición</CardTitle>
            <CardDescription>
              Los cambios quedan registrados en la bitácora del sistema. Las estimaciones existentes conservan los valores con los que fueron calculadas.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="value">Valor</Label>
              {isJson ? (
                <Textarea
                  id="value"
                  rows={8}
                  className="font-mono text-xs"
                  value={param.value ?? ""}
                  onChange={(e) => setParam({ ...param, value: e.target.value })}
                />
              ) : (
                <Input
                  id="value"
                  value={param.value ?? ""}
                  onChange={(e) => setParam({ ...param, value: e.target.value })}
                />
              )}
              <p className="text-xs text-muted-foreground">
                Unidad actual: <Badge variant="secondary" className="text-xs">{param.unit}</Badge>
                {param.base && <> · Base: <code className="bg-muted px-1 rounded">{param.base}</code></>}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="effectiveFrom">Vigencia desde</Label>
                <Input
                  id="effectiveFrom"
                  type="date"
                  value={param.effectiveFrom.split("T")[0]}
                  disabled
                />
                <p className="text-xs text-muted-foreground">Inmutable. Para cambiarla crear un parámetro nuevo.</p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="effectiveUntil">Vigencia hasta (opcional)</Label>
                <Input
                  id="effectiveUntil"
                  type="date"
                  value={param.effectiveUntil ? param.effectiveUntil.split("T")[0] : ""}
                  onChange={(e) => setParam({ ...param, effectiveUntil: e.target.value || null })}
                />
                <p className="text-xs text-muted-foreground">Si se llena, el parámetro queda vencido a partir de esa fecha.</p>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="source">Fundamento legal / fuente</Label>
              <Input
                id="source"
                value={param.source}
                onChange={(e) => setParam({ ...param, source: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="sourceUrl">URL de la fuente oficial</Label>
              <Input
                id="sourceUrl"
                type="url"
                placeholder="https://www.dof.gob.mx/..."
                value={param.sourceUrl ?? ""}
                onChange={(e) => setParam({ ...param, sourceUrl: e.target.value || null })}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">Notas</Label>
              <Textarea
                id="notes"
                rows={3}
                value={param.notes ?? ""}
                onChange={(e) => setParam({ ...param, notes: e.target.value || null })}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </CardContent>
        </Card>

        <div className="flex justify-between gap-3 mt-4">
          <Button type="button" variant="destructive" onClick={handleDelete}>
            <Trash2 className="w-4 h-4 mr-2" />Marcar como vencido
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" asChild>
              <Link href="/admin/parametros">Cancelar</Link>
            </Button>
            <Button type="submit" disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Guardando…" : "Guardar cambios"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
