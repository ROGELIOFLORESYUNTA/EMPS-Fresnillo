"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { apiPost } from "@/lib/api-client";

/**
 * Alta de un proyecto en la cara del desarrollador: tres campos de texto, los
 * tres opcionales, y un botón. Todo lo demás va en "Más datos (opcional)",
 * plegado. Lo que se deja vacío se llena con valores neutros: cliente privado
 * (tipo "externo", sin oficina) y nombre y objetivo por definir. El proyecto
 * se puede afinar después.
 */

const SIN_AREA = "No aplica: cliente privado";

const TIPOS_DE_SISTEMA = [
  { value: "crud_interno", label: "Sistema interno (registros, citas, inventario)", ayuda: "Sirve para registrar, consultar y actualizar información del negocio de tu cliente." },
  { value: "portal_ciudadano", label: "Portal o sitio para los clientes de tu cliente", ayuda: "Una página donde la gente consulta o pide algo desde su casa." },
  { value: "integrador", label: "Conecta dos o más sistemas", ayuda: "Un puente para que los sistemas se pasen información solos." },
  { value: "reportes", label: "Reportes y tableros", ayuda: "Resume la información para tomar decisiones." },
  { value: "movil", label: "Aplicación para celular", ayuda: "Para clientes o para personal en campo." },
  { value: "tramites", label: "Trámites o solicitudes en línea", ayuda: "Solicitud, pago, seguimiento y respuesta, todo en un solo lugar." },
];

export function NuevoProyectoDesarrollador() {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [necesitaIdentidad, setNecesitaIdentidad] = useState<boolean | null>(null);
  const [identidad, setIdentidad] = useState({ displayName: "", contactEmail: "" });
  const [form, setForm] = useState({
    nombre: "",
    paraQueSirve: "",
    paraQuien: "",
    // Más datos
    area: "",
    systemType: "crud_interno",
    responsible: "",
    expectedUsers: "",
    priority: "media",
    notes: "",
  });

  useEffect(() => {
    fetch("/api/workspace/me")
      .then((r) => r.json())
      .then((d) => setNecesitaIdentidad(!d.workspace?.displayName))
      .catch(() => setNecesitaIdentidad(false)); // si falla la consulta, no se bloquea el alta
  }, []);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    const queSirve = form.paraQueSirve.trim();
    const nombre = form.nombre.trim() || (queSirve ? queSirve.slice(0, 60).trimEnd() : "Proyecto sin nombre");
    const cliente = form.paraQuien.trim();
    const area = form.area.trim();
    const base = {
      name: nombre.length >= 2 ? nombre : "Proyecto sin nombre",
      client: cliente.length >= 2 ? cliente : "Cliente por definir",
      clientType: "externo",
      municipalArea: area.length >= 2 ? area : SIN_AREA,
      objective: queSirve.length >= 5 ? queSirve : "Por definir: se afina después",
      systemType: form.systemType,
      responsible: form.responsible.trim() || undefined,
      priority: form.priority,
      notes: form.notes.trim() || undefined,
      expectedUsers: form.expectedUsers ? Number(form.expectedUsers) : null,
    };
    const nombreIdentidad = identidad.displayName.trim();
    const correo = identidad.contactEmail.trim();
    const datosDeIdentidad = { ...(nombreIdentidad ? { displayName: nombreIdentidad } : {}), ...(correo ? { contactEmail: correo } : {}) };
    const payload = necesitaIdentidad && Object.keys(datosDeIdentidad).length > 0 ? { ...base, identity: datosDeIdentidad } : base;
    try {
      const result = await apiPost<{ project: { id: string } }>("/api/projects", payload);
      if (necesitaIdentidad && nombreIdentidad) {
        // El encabezado muestra el nombre en cuanto queda guardado.
        window.dispatchEvent(new CustomEvent("emps:identity-changed"));
      }
      router.push(`/projects/${result.project.id}`);
    } catch (err) {
      const raw = err instanceof Error ? err.message : "";
      setError(
        raw.includes("correo") || raw.includes("nombre")
          ? raw
          : raw.includes("workspace")
            ? "No se pudo identificar tu sesión. Recarga la página e intenta de nuevo."
            : "No se pudo guardar el proyecto. Intenta de nuevo.",
      );
      setEnviando(false);
    }
  }

  const ayudaDelTipo = TIPOS_DE_SISTEMA.find((t) => t.value === form.systemType)?.ayuda;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-titulo text-tinta">Nuevo proyecto</h1>
      <p className="mt-2 text-base text-tinta-suave">Tres datos y empiezas. Todos son opcionales; los afinas después.</p>

      <form onSubmit={enviar} className="mt-6 space-y-5">
        <div className="space-y-1">
          <Label htmlFor="nombre" className="text-base">
            Nombre del proyecto
          </Label>
          <Input id="nombre" value={form.nombre} onChange={set("nombre")} placeholder="Ej. Sistema de citas para una clínica dental" className="h-12 text-base" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="para-que-sirve" className="text-base">
            ¿Para qué sirve?
          </Label>
          <Input
            id="para-que-sirve"
            value={form.paraQueSirve}
            onChange={set("paraQueSirve")}
            placeholder="Ej. Que los pacientes agenden desde el celular y no se pierdan citas"
            className="h-12 text-base"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="para-quien" className="text-base">
            ¿Para quién es?
          </Label>
          <Input id="para-quien" value={form.paraQuien} onChange={set("paraQuien")} placeholder="Ej. Clínica Dental Sonrisa" className="h-12 text-base" />
        </div>

        <details className="rounded-lg border bg-lienzo">
          <summary className="cursor-pointer px-4 py-3 text-base font-semibold text-tinta">Más datos (opcional)</summary>
          <div className="space-y-5 px-4 pb-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="tipo" className="text-base">
                  Tipo de sistema
                </Label>
                <Select id="tipo" value={form.systemType} onChange={set("systemType")} className="h-12 text-base">
                  {TIPOS_DE_SISTEMA.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </Select>
                {ayudaDelTipo && <p className="text-base text-tinta-suave">{ayudaDelTipo}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="usuarios" className="text-base">
                  ¿Cuántas personas lo van a usar?
                </Label>
                <Input id="usuarios" type="number" inputMode="numeric" min={1} value={form.expectedUsers} onChange={set("expectedUsers")} placeholder="Ej. 6" className="h-12 text-base" />
                <p className="text-base text-tinta-suave">Si se arma en una plataforma, cada persona paga licencia.</p>
              </div>
              <div className="space-y-1">
                <Label htmlFor="responsable" className="text-base">
                  ¿Quién da seguimiento por parte del cliente?
                </Label>
                <Input id="responsable" value={form.responsible} onChange={set("responsible")} placeholder="Ej. La dueña de la clínica" className="h-12 text-base" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="area" className="text-base">
                  Área o equipo del cliente que lo usa
                </Label>
                <Input id="area" value={form.area} onChange={set("area")} placeholder="Ej. Recepción" className="h-12 text-base" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="prioridad" className="text-base">
                  Prioridad
                </Label>
                <Select id="prioridad" value={form.priority} onChange={set("priority")} className="h-12 text-base">
                  <option value="baja">Baja</option>
                  <option value="media">Media</option>
                  <option value="alta">Alta</option>
                  <option value="critica">Crítica</option>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="notas" className="text-base">
                Notas
              </Label>
              <Textarea id="notas" value={form.notes} onChange={set("notes")} rows={3} placeholder="Restricciones, dependencias, lo que te dijo el cliente..." className="text-base" />
            </div>

            {necesitaIdentidad && (
              <div className="space-y-3 border-t pt-4">
                <p className="text-base text-tinta-suave">
                  Tu nombre y tu correo sirven para que reconozcas tu cuenta y recuperes tus proyectos. No hay registro ni contraseña.{" "}
                  <Link href="/privacidad" className="font-semibold text-accion underline underline-offset-4">
                    Aviso de privacidad
                  </Link>
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="identidad-nombre" className="text-base">
                      Tu nombre
                    </Label>
                    <Input
                      id="identidad-nombre"
                      value={identidad.displayName}
                      onChange={(e) => setIdentidad((i) => ({ ...i, displayName: e.target.value }))}
                      maxLength={80}
                      placeholder="Ej. María Hernández"
                      className="h-12 text-base"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="identidad-correo" className="text-base">
                      Tu correo
                    </Label>
                    <Input
                      id="identidad-correo"
                      type="email"
                      value={identidad.contactEmail}
                      onChange={(e) => setIdentidad((i) => ({ ...i, contactEmail: e.target.value }))}
                      maxLength={120}
                      placeholder="Ej. maria@correo.com"
                      className="h-12 text-base"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </details>

        {error && <p className="text-base text-amber-800">{error}</p>}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={enviando || necesitaIdentidad === null}
            className="inline-flex h-12 items-center justify-center rounded-lg bg-marino px-7 text-base font-semibold text-white transition-colors hover:bg-marino/90 disabled:pointer-events-none disabled:opacity-50"
          >
            {enviando ? "Guardando..." : "Crear y continuar"}
          </button>
          <Link href="/cotizar" className="text-base font-semibold text-accion underline underline-offset-4">
            Prefiero cotizar en un minuto
          </Link>
        </div>
      </form>
    </div>
  );
}
