"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { apiPost } from "@/lib/api-client";
import { ROLES } from "@/lib/roles";
import { UserCircle2 } from "lucide-react";

// Qué es cada tipo de sistema, sin tecnicismos (se muestra bajo el select).
const SYSTEM_TYPE_HELP: Record<string, string> = {
  crud_interno: "Sistema interno para registrar, consultar y actualizar información de un área (altas, bajas, cambios).",
  portal_ciudadano: "Página donde el ciudadano consulta o solicita algo directamente desde su casa.",
  integrador: "Puente que conecta dos o más sistemas para que se compartan información automáticamente.",
  reportes: "Tableros y reportes que resumen la información para tomar decisiones.",
  movil: "Aplicación para celular (para ciudadanos o para personal en campo).",
  tramites: "Digitaliza un trámite completo: solicitud, pagos, seguimiento y resolución.",
};

const CLIENT_TYPE_HELP: Record<string, string> = {
  municipal: "El Ayuntamiento directamente (una dirección o área municipal).",
  paramunicipal: "Organismo del municipio con administración propia (ej. el sistema de agua, el DIF municipal).",
  externo: "Cliente privado o de otro gobierno, fuera del Ayuntamiento.",
};

export default function NewProjectPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Si la persona todavía no tiene nombre guardado, este alta es también su
  // presentación: se le pide aquí, dentro del flujo, y no en una pantalla de
  // registro aparte.
  const [needsIdentity, setNeedsIdentity] = useState<boolean | null>(null);
  const [identity, setIdentity] = useState({ displayName: "", role: "", contactEmail: "" });
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
    expectedUsers: "",
  });

  useEffect(() => {
    fetch("/api/workspace/me")
      .then((r) => r.json())
      .then((d) => setNeedsIdentity(!d.workspace?.displayName))
      .catch(() => setNeedsIdentity(false)); // si falla la consulta, no bloqueamos el alta
  }, []);

  const setIdentityField = (k: keyof typeof identity) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setIdentity((i) => ({ ...i, [k]: e.target.value }));

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const base = { ...form, expectedUsers: form.expectedUsers ? Number(form.expectedUsers) : null };
      const payload = needsIdentity ? { ...base, identity } : base;
      const result = await apiPost<{ project: { id: string } }>("/api/projects", payload);
      if (needsIdentity) {
        // El encabezado muestra el nombre en cuanto queda guardado.
        window.dispatchEvent(new CustomEvent("emps:identity-changed"));
      }
      router.push(`/projects/${result.project.id}`);
    } catch (e) {
      const raw = e instanceof Error ? e.message : "";
      setError(
        raw.includes("correo") || raw.includes("nombre") || raw.includes("lado")
          ? raw
          : raw.includes("workspace")
            ? "No se pudo identificar tu sesión. Recarga la página e intenta de nuevo."
            : "No se pudo guardar el proyecto. Revisa que el nombre, el área y el objetivo estén llenos, e intenta de nuevo.",
      );
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Nuevo proyecto</h1>
        <p className="text-muted-foreground text-sm">Captura los datos generales y el contexto municipal.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {needsIdentity && (
          <Card className="border-blue-200 bg-blue-50/40">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <UserCircle2 className="w-5 h-5 text-blue-600" />
                ¿De quién es este proyecto?
              </CardTitle>
              <CardDescription>
                Es la primera vez que capturas aquí. Con estos dos datos el sistema sabe de quién son los proyectos y
                desde qué lado recomendarte la mejor opción. No hay registro ni contraseña.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="identityName">Tu nombre *</Label>
                <Input
                  id="identityName"
                  value={identity.displayName}
                  onChange={setIdentityField("displayName")}
                  required
                  minLength={2}
                  maxLength={80}
                  placeholder="ej. María Hernández"
                />
              </div>
              <div className="grid gap-2">
                <Label>¿Desde qué lado vas a usar el sistema? *</Label>
                <div className="grid sm:grid-cols-2 gap-2">
                  <button type="button" onClick={() => setIdentity((prev) => ({ ...prev, role: "operador_municipal" }))} className={`rounded-md border p-3 text-left text-sm hover:bg-accent ${identity.role === "operador_municipal" ? "border-primary ring-1 ring-primary" : ""}`}>
                    <p className="font-medium">Soy del Ayuntamiento</p>
                    <p className="text-xs text-muted-foreground">Cuido el presupuesto y que se termine a tiempo.</p>
                  </button>
                  <button type="button" onClick={() => setIdentity((prev) => ({ ...prev, role: "proveedor" }))} className={`rounded-md border p-3 text-left text-sm hover:bg-accent ${identity.role === "proveedor" ? "border-primary ring-1 ring-primary" : ""}`}>
                    <p className="font-medium">Soy proveedor</p>
                    <p className="text-xs text-muted-foreground">Cuido mi utilidad, mi tiempo y el dinero que adelanto.</p>
                  </button>
                </div>
                <details open={identity.role !== "operador_municipal" && identity.role !== "proveedor"}>
                  <summary className="text-xs text-muted-foreground cursor-pointer">Soy otra cosa (investigador, solo explorando)</summary>
                  <Select id="identityRole" value={identity.role} onChange={setIdentityField("role")} required className="mt-2">
                    <option value="" disabled>Elige una opción</option>
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>{r.short}</option>
                    ))}
                  </Select>
                </details>
                <p className="text-xs text-muted-foreground">
                  El Ayuntamiento y el proveedor no buscan lo mismo: uno cuida el presupuesto y el otro el margen y el
                  tiempo. El sistema ordena las opciones según lo que contestes.
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="identityEmail">Correo (opcional)</Label>
                <Input
                  id="identityEmail"
                  type="email"
                  value={identity.contactEmail}
                  onChange={setIdentityField("contactEmail")}
                  maxLength={120}
                  placeholder="ej. maria@fresnillo.gob.mx"
                />
                <p className="text-xs text-muted-foreground">
                  Solo por si pierdes tu llave de acceso y necesitas recuperar tus proyectos desde otra computadora. No
                  se usa para nada más ni se comparte.{" "}
                  <Link href="/privacidad" className="text-primary hover:underline">Aviso de privacidad</Link>
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Datos generales</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nombre del proyecto *</Label>
              <Input id="name" value={form.name} onChange={set("name")} required minLength={2} placeholder="ej. Sistema de trámites para Atención Ciudadana" />
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
                <p className="text-xs text-muted-foreground">{CLIENT_TYPE_HELP[form.clientType]}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="municipalArea">Oficina que lo va a usar *</Label>
                <Input id="municipalArea" value={form.municipalArea} onChange={set("municipalArea")} required placeholder="ej. Catastro, Tesorería, Atención Ciudadana" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="systemType">Tipo de sistema</Label>
                <Select id="systemType" value={form.systemType} onChange={set("systemType")}>
                  <option value="crud_interno">Sistema interno de registros</option>
                  <option value="portal_ciudadano">Portal ciudadano</option>
                  <option value="integrador">Integrador (conecta sistemas)</option>
                  <option value="reportes">Reportes y tableros</option>
                  <option value="movil">Aplicación móvil</option>
                  <option value="tramites">Trámites en línea</option>
                </Select>
                <p className="text-xs text-muted-foreground">{SYSTEM_TYPE_HELP[form.systemType]}</p>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="objective">¿Para qué es el sistema y qué debe hacer? *</Label>
              <Textarea id="objective" value={form.objective} onChange={set("objective")} required minLength={5} rows={4} placeholder="Ejemplo: que la gente pague el predial desde su casa y que Catastro vea quién ya pagó. Hoy se hace en ventanilla, con papel." />
              <p className="text-xs text-muted-foreground">Con tus palabras: qué problema resuelve, quién lo va a usar y qué hacen hoy sin él.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="responsible">Responsable</Label>
                <Input id="responsible" value={form.responsible} onChange={set("responsible")} placeholder="Quién da seguimiento por parte del área" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="expectedUsers">¿Cuántas personas lo van a usar en la oficina?</Label>
                <Input id="expectedUsers" type="number" min={1} value={form.expectedUsers} onChange={set("expectedUsers")} placeholder="ej. 25" />
                <p className="text-xs text-muted-foreground">Opcional. Si se hace con una plataforma de armado, cada persona que lo use paga licencia mientras lo use.</p>
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
              <Textarea id="notes" value={form.notes} onChange={set("notes")} placeholder="Restricciones, dependencias, observaciones..." />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 mt-4">
          <Button variant="outline" type="button" asChild>
            <Link href="/projects">Cancelar</Link>
          </Button>
          <Button type="submit" disabled={submitting || needsIdentity === null}>
            {submitting ? "Guardando..." : "Crear y continuar"}
          </Button>
        </div>
      </form>
    </div>
  );
}
