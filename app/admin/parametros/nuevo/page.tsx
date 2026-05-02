"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { apiPost } from "@/lib/api-client";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ChevronLeft, Save } from "lucide-react";

export default function NuevoParametroPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    year: new Date().getFullYear(),
    country: "Mexico",
    state: "Zacatecas",
    key: "",
    value: "",
    unit: "rate",
    base: "",
    source: "",
    sourceUrl: "",
    effectiveFrom: new Date().toISOString().split("T")[0],
    notes: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiPost("/api/parameters/nuevo", {
        year: form.year,
        country: form.country,
        state: form.state || null,
        key: form.key.trim().toUpperCase().replace(/\s+/g, "_"),
        value: form.value || null,
        unit: form.unit,
        base: form.base || null,
        source: form.source,
        sourceUrl: form.sourceUrl || null,
        effectiveFrom: new Date(form.effectiveFrom).toISOString(),
        notes: form.notes || null,
      });
      router.push("/admin/parametros");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar");
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Breadcrumbs items={[
        { label: "Editar parámetros", href: "/admin/parametros" },
        { label: "Nuevo parámetro" },
      ]} />

      <div>
        <h1 className="text-2xl font-bold">Nuevo parámetro</h1>
        <p className="text-sm text-muted-foreground">Agregar un parámetro fiscal o laboral nuevo, o registrar la versión de un año posterior.</p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Datos del parámetro</CardTitle>
            <CardDescription>Llenar todos los campos. La clave (key) debe ser única para el año/estado.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="year">Año fiscal</Label>
                <Input id="year" type="number" min={2020} max={2100} value={form.year} onChange={(e) => setForm({ ...form, year: +e.target.value })} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="country">País</Label>
                <Input id="country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="state">Estado / Entidad</Label>
                <Input id="state" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} placeholder="Zacatecas (opcional)" />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="key">Clave (key)</Label>
              <Input id="key" value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} placeholder="ej. ISN_ZACATECAS" required />
              <p className="text-xs text-muted-foreground">Se convierte automáticamente a mayúsculas. Sin espacios.</p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 grid gap-2">
                <Label htmlFor="value">Valor</Label>
                <Input id="value" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder="ej. 0.035" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="unit">Unidad</Label>
                <Select id="unit" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
                  <option value="rate">rate (porcentaje 0-1)</option>
                  <option value="MXN">MXN (pesos)</option>
                  <option value="dias_salario">dias_salario</option>
                  <option value="json">json</option>
                  <option value="table">tabla escalonada</option>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="base">Base de cálculo (opcional)</Label>
                <Input id="base" value={form.base} onChange={(e) => setForm({ ...form, base: e.target.value })} placeholder="ej. SBC, UMA_DIARIA" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="effectiveFrom">Vigencia desde</Label>
                <Input id="effectiveFrom" type="date" value={form.effectiveFrom} onChange={(e) => setForm({ ...form, effectiveFrom: e.target.value })} required />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="source">Fundamento legal / fuente</Label>
              <Input id="source" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} required placeholder="ej. SAT LISR Articulo 9" />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="sourceUrl">URL de la fuente oficial</Label>
              <Input id="sourceUrl" type="url" value={form.sourceUrl} onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })} placeholder="https://www.dof.gob.mx/..." />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">Notas</Label>
              <Textarea id="notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 mt-4">
          <Button type="button" variant="outline" asChild>
            <Link href="/admin/parametros">Cancelar</Link>
          </Button>
          <Button type="submit" disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Guardando…" : "Guardar parámetro"}
          </Button>
        </div>
      </form>
    </div>
  );
}
