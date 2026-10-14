"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { apiPost } from "@/lib/api-client";

/**
 * Cotizar en un minuto: de la descripción a la cifra sin pasar por el flujo
 * completo. Se piden solo las cosas que cualquier patrón sabe: qué sistema
 * quiere, qué partes debe tener, cuánto dinero tiene y para cuándo. Lo demás
 * se llena con valores típicos y se puede afinar después en el proyecto.
 */

const SUGERENCIAS = [
  "Registro y consulta (altas, bajas, cambios)",
  "Pago en línea",
  "Portal para el ciudadano",
  "Reportes para la dirección",
  "Catálogo de trámites",
  "Aplicación para celular",
  "Conexión con otro sistema",
];

const DISPONIBILIDAD = [
  { value: "alta", label: "Alguien de tiempo completo", detalle: "Resuelve dudas el mismo día." },
  { value: "media", label: "Alguien que atiende cuando puede", detalle: "Contesta en unos días." },
  { value: "baja", label: "Casi nadie", detalle: "Hay que perseguir a la gente para que responda." },
];

export default function CotizarPage() {
  const router = useRouter();
  const inicio = useRef<number>(0);
  const [queSistema, setQueSistema] = useState("");
  const [partes, setPartes] = useState("");
  const [presupuesto, setPresupuesto] = useState("");
  const [fechaLimite, setFechaLimite] = useState("");
  const [disponibilidad, setDisponibilidad] = useState<string>("media");
  const [experienciaIA, setExperienciaIA] = useState<number>(3);
  const [personas, setPersonas] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    inicio.current = Date.now();
  }, []);

  const listaPartes = partes.split("\n").map((s) => s.trim()).filter(Boolean);

  function agregarSugerencia(texto: string) {
    if (listaPartes.includes(texto)) return;
    setPartes((prev) => (prev.trim() ? `${prev.trim()}\n${texto}` : texto));
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (queSistema.trim().length < 10) {
      setError("Cuéntanos qué sistema necesitas, aunque sea en una frase.");
      return;
    }
    if (listaPartes.length === 0) {
      setError("Escribe al menos una parte del sistema (o toca una de las sugerencias).");
      return;
    }
    setEnviando(true);
    try {
      const result = await apiPost<{ project: { id: string } }>("/api/cotizar", {
        queSistema: queSistema.trim(),
        partes: listaPartes,
        presupuesto: presupuesto ? Number(presupuesto) : null,
        fechaLimite: fechaLimite || null,
        disponibilidadCliente: disponibilidad,
        experienciaIA,
        personasQueLoUsan: personas ? Number(personas) : null,
        segundosEnLlenar: Math.round((Date.now() - inicio.current) / 1000),
      });
      router.push(`/projects/${result.project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo calcular. Intenta de nuevo.");
      setEnviando(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Cotizar en un minuto</h1>
        <p className="text-muted-foreground">
          Tres preguntas y el sistema te da cuánto cuesta, cuánto tarda y con qué forma de hacerlo. Después
          puedes afinar cada dato; nada se pierde.
        </p>
      </div>

      <form onSubmit={enviar} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">1. ¿Qué sistema necesitas?</CardTitle>
            <CardDescription>Con tus palabras. Para qué sirve y quién lo va a usar.</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={queSistema}
              onChange={(e) => setQueSistema(e.target.value)}
              rows={3}
              placeholder="Ejemplo: que la gente pague el predial desde su casa y que Catastro vea quién ya pagó."
              required
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">2. ¿Qué partes debe tener?</CardTitle>
            <CardDescription>Una por renglón. Si no sabes cómo se llaman, toca las sugerencias.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {SUGERENCIAS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => agregarSugerencia(s)}
                  className="rounded-full border px-3 py-1 text-xs hover:bg-accent disabled:opacity-50"
                  disabled={listaPartes.includes(s)}
                >
                  + {s}
                </button>
              ))}
            </div>
            <Textarea
              value={partes}
              onChange={(e) => setPartes(e.target.value)}
              rows={5}
              placeholder={"Registro de contribuyentes\nPago en línea\nReporte mensual de cobranza"}
            />
            <p className="text-xs text-muted-foreground">{listaPartes.length} parte(s). Cada una se calcula con valores típicos; en el proyecto puedes decir cuál es más grande o más delicada.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">3. ¿Cuánto dinero tienes y para cuándo?</CardTitle>
            <CardDescription>Los dos son opcionales, pero con ellos el resultado te dice si te alcanza y si llega a tiempo.</CardDescription>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="presupuesto">Dinero disponible (pesos, con IVA)</Label>
              <Input id="presupuesto" type="number" min={0} step={1000} value={presupuesto} onChange={(e) => setPresupuesto(e.target.value)} placeholder="500000" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="fecha">Fecha límite</Label>
              <Input id="fecha" type="date" value={fechaLimite} onChange={(e) => setFechaLimite(e.target.value)} />
            </div>
            <div className="sm:col-span-2 space-y-2">
              <Label>¿Quién va a resolver las dudas del lado de quien pide el sistema?</Label>
              <div className="grid sm:grid-cols-3 gap-2">
                {DISPONIBILIDAD.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => setDisponibilidad(d.value)}
                    className={`rounded-md border p-3 text-left text-sm hover:bg-accent ${disponibilidad === d.value ? "border-primary ring-1 ring-primary" : ""}`}
                  >
                    <p className="font-medium">{d.label}</p>
                    <p className="text-xs text-muted-foreground">{d.detalle}</p>
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Entre menos disponible esté, más horas de espera y de ir y venir se suman.</p>
            </div>
            <div className="sm:col-span-2 space-y-2">
              <Label>¿Quien lo va a hacer ya programa con IA?</Label>
              <div className="grid sm:grid-cols-3 gap-2">
                {[
                  { v: 1, t: "Nunca", d: "Las herramientas de IA no le ahorran tiempo todavía." },
                  { v: 3, t: "A veces", d: "La usa en algunos proyectos; se acredita parte del ahorro." },
                  { v: 4, t: "Todos los días", d: "Sabe dar instrucciones y revisar lo que genera." },
                ].map((o) => (
                  <button key={o.v} type="button" onClick={() => setExperienciaIA(o.v)} className={`rounded-md border p-3 text-left text-sm hover:bg-accent ${experienciaIA === o.v ? "border-primary ring-1 ring-primary" : ""}`}>
                    <p className="font-medium">{o.t}</p>
                    <p className="text-xs text-muted-foreground">{o.d}</p>
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Cambia cuánto ahorra la IA y si conviene hacerlo casi todo con IA. Las herramientas de IA se cobran aparte, según la forma de hacerlo.</p>
            </div>
            <div className="space-y-1">
              <Label htmlFor="personas">¿Cuántas personas lo van a usar? (opcional)</Label>
              <Input id="personas" type="number" min={1} value={personas} onChange={(e) => setPersonas(e.target.value)} placeholder="25" />
              <p className="text-xs text-muted-foreground">Si se hace con una plataforma de armado, cada persona paga licencia mientras lo use.</p>
            </div>
          </CardContent>
        </Card>

        {error && <p className="text-sm text-red-700">{error}</p>}

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" size="lg" disabled={enviando}>
            {enviando ? "Calculando las 5 formas de hacerlo..." : "Calcular cuánto cuesta"}
          </Button>
          <Link href="/projects/new" className="text-sm underline text-muted-foreground">Prefiero capturar el proyecto completo</Link>
        </div>
        <p className="text-xs text-muted-foreground">
          Lo que se asume mientras no lo cambies: cada parte es de tamaño mediano y con una pantalla; el equipo es un
          desarrollador con experiencia a sueldo de nómina, con la pericia con la IA que contestes y sus herramientas cobradas según la forma de hacerlo; la utilidad del proveedor es 20 %. Todo se puede ajustar en el proyecto.
        </p>
      </form>
    </div>
  );
}
