"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiPost } from "@/lib/api-client";

export default function NewProjectPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    client: "Ayuntamiento de Fresnillo",
    clientType: "municipal",
    municipalArea: "",
    objective: "",
    systemType: "crud_interno",
    responsible: "",
    priority: "media",
    notes: "",
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const result = await apiPost<{ project: { id: string } }>("/api/projects", form);
      router.push(`/projects/${result.project.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Nuevo proyecto</h1>
        <p className="text-muted-foreground text-sm">Captura los datos generales y el contexto municipal.</p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Datos generales</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nombre del proyecto *</Label>
              <Input id="name" value={form.name} onChange={set("name")} required minLength={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="client">Cliente *</Label>
                <Input id="client" value={form.client} onChange={set("client")} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="clientType">Tipo de cliente</Label>
                <Select id="clientType" value={form.clientType} onChange={set("clientType")}>
                  <option value="municipal">Municipal</option>
                  <option value="paramunicipal">Paramunicipal</option>
                  <option value="externo">Externo</option>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="municipalArea">Área usuaria *</Label>
                <Input id="municipalArea" value={form.municipalArea} onChange={set("municipalArea")} required placeholder="ej. Atención Ciudadana" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="systemType">Tipo de sistema</Label>
                <Select id="systemType" value={form.systemType} onChange={set("systemType")}>
                  <option value="crud_interno">CRUD interno</option>
                  <option value="portal_ciudadano">Portal ciudadano</option>
                  <option value="integrador">Integrador / API</option>
                  <option value="reportes">Reportes / BI</option>
                  <option value="movil">Móvil</option>
                  <option value="tramites">Trámites</option>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="objective">Objetivo administrativo *</Label>
              <Textarea id="objective" value={form.objective} onChange={set("objective")} required minLength={5} placeholder="¿Qué problema administrativo resuelve?" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Descripción detallada</Label>
              <Textarea id="description" value={form.description} onChange={set("description")} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="responsible">Responsable</Label>
                <Input id="responsible" value={form.responsible} onChange={set("responsible")} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="priority">Prioridad</Label>
                <Select id="priority" value={form.priority} onChange={set("priority")}>
                  <option value="baja">Baja</option>
                  <option value="media">Media</option>
                  <option value="alta">Alta</option>
                  <option value="critica">Crítica</option>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">Notas</Label>
              <Textarea id="notes" value={form.notes} onChange={set("notes")} placeholder="Restricciones, dependencias, observaciones…" />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 mt-4">
          <Button variant="outline" type="button" asChild>
            <Link href="/projects">Cancelar</Link>
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Guardando…" : "Crear y continuar"}
          </Button>
        </div>
      </form>
    </div>
  );
}
