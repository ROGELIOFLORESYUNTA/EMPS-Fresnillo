"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiPost } from "@/lib/api-client";
import { cn } from "@/lib/utils";

/**
 * Cotizar en un minuto, cara del desarrollador: tres pasos, una sola cosa por
 * paso. 1) qué tiene que hacer el sistema (se toca lo que aplica); 2) quién
 * lo hace; 3) cuánto dinero y para cuándo, los dos opcionales. Lo demás (quién
 * resuelve las dudas, cuántas personas lo usan) va plegado en "Afinar
 * después" con valores típicos ya puestos. La cifra sale al final del tercer
 * paso y todo se puede afinar en el proyecto.
 */

const PARTES = [
  "Sitio con catálogo",
  "Sistema de citas",
  "Tienda en línea",
  "App para celular",
  "Panel de reportes",
  "Conexión con otro sistema",
  "Pagos en línea",
];

type QuienLoHace = "solo" | "contrato_senior" | "contrato_junior";

const EXPERIENCIA_IA = [
  { v: 1, t: "Nunca" },
  { v: 3, t: "A veces" },
  { v: 4, t: "Todos los días" },
];

const DISPONIBILIDAD = [
  { value: "alta", label: "Alguien de tiempo completo", detalle: "Contesta el mismo día." },
  { value: "media", label: "Alguien que atiende cuando puede", detalle: "Contesta en unos días." },
  { value: "baja", label: "Casi nadie", detalle: "Hay que perseguir a la gente." },
];

const PASOS = ["¿Qué tiene que hacer el sistema?", "¿Quién lo hace?", "¿Cuánto dinero y para cuándo?"] as const;

/** Une una lista en español: "a", "a y b", "a, b y c". */
function unirConY(partes: string[]): string {
  if (partes.length <= 1) return partes.join("");
  return `${partes.slice(0, -1).join(", ")} y ${partes[partes.length - 1]}`;
}

function Pastilla({ activa, onClick, children, className }: { activa: boolean; onClick: () => void; children: React.ReactNode; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activa}
      className={cn(
        "min-h-11 rounded-full border px-4 text-base transition-colors",
        activa ? "border-marino bg-marino font-semibold text-white" : "bg-lienzo text-tinta hover:bg-papel",
        className,
      )}
    >
      {children}
    </button>
  );
}

function Opcion({ activa, onClick, titulo, detalle }: { activa: boolean; onClick: () => void; titulo: string; detalle: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activa}
      className={cn("min-h-11 rounded-xl border-2 p-4 text-left transition-colors", activa ? "border-marino bg-lienzo" : "border-border bg-lienzo hover:bg-papel")}
    >
      <span className="block text-base font-semibold text-tinta">{titulo}</span>
      <span className="block text-base text-tinta-suave">{detalle}</span>
    </button>
  );
}

const botonPrincipal =
  "inline-flex h-12 items-center justify-center rounded-lg bg-marino px-7 text-base font-semibold text-white transition-colors hover:bg-marino/90 disabled:pointer-events-none disabled:opacity-50";

export function CotizarDesarrollador({ ejemploId }: { ejemploId: string | null }) {
  const router = useRouter();
  const inicio = useRef<number>(0);
  const titulo = useRef<HTMLHeadingElement>(null);
  const [paso, setPaso] = useState<1 | 2 | 3>(1);
  const [partes, setPartes] = useState<string[]>([]);
  const [conPalabras, setConPalabras] = useState("");
  const [quien, setQuien] = useState<"solo" | "contrato">("solo");
  const [nivel, setNivel] = useState<"senior" | "junior">("senior");
  const [experienciaIA, setExperienciaIA] = useState<number>(4);
  const [presupuesto, setPresupuesto] = useState("");
  const [fechaLimite, setFechaLimite] = useState("");
  const [disponibilidad, setDisponibilidad] = useState("media");
  const [personas, setPersonas] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    inicio.current = Date.now();
  }, []);

  // Al cambiar de paso, el foco va al título para quien usa lector de pantalla o teclado.
  useEffect(() => {
    if (paso > 1) titulo.current?.focus();
  }, [paso]);

  const texto = conPalabras.trim();
  const hayAlgo = partes.length > 0 || texto.length >= 3;

  function alternar(parte: string) {
    setPartes((prev) => (prev.includes(parte) ? prev.filter((p) => p !== parte) : [...prev, parte]));
  }

  function elegirQuien(q: "solo" | "contrato") {
    setQuien(q);
    // Quien programa solo ya usa la IA a diario; con contrato se pregunta.
    setExperienciaIA(q === "solo" ? 4 : 3);
  }

  async function calcular() {
    setError(null);
    // Si no hay partes tocadas, la frase libre hace de única parte.
    const lista = partes.length > 0 ? partes : [texto.slice(0, 80)];
    // Sin frase libre, el nombre sale de las partes: "Sistema de citas y pagos en línea".
    const deLasPartes = unirConY(lista.map((p, i) => (i === 0 ? p : p.charAt(0).toLowerCase() + p.slice(1))));
    const queSistema = texto.length >= 10 ? texto : deLasPartes.length >= 10 ? deLasPartes : `Sistema: ${deLasPartes}`;
    const quienLoHace: QuienLoHace = quien === "solo" ? "solo" : nivel === "junior" ? "contrato_junior" : "contrato_senior";
    setEnviando(true);
    try {
      const result = await apiPost<{ project: { id: string } }>("/api/cotizar", {
        queSistema: queSistema.slice(0, 2000),
        partes: lista,
        presupuesto: presupuesto ? Number(presupuesto) : null,
        fechaLimite: fechaLimite || null,
        disponibilidadCliente: disponibilidad,
        experienciaIA,
        quienLoHace,
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
    <div className="mx-auto max-w-2xl">
      {/* Dónde voy: Paso N de 3 */}
      <div aria-label={`Paso ${paso} de 3`} className="flex items-center gap-3">
        <p className="text-base font-semibold text-tinta-suave">Paso {paso} de 3</p>
        <div className="flex flex-1 gap-1" aria-hidden>
          {[1, 2, 3].map((n) => (
            <span key={n} className={cn("h-1.5 flex-1 rounded-full", n <= paso ? "bg-marino" : "bg-border")} />
          ))}
        </div>
      </div>

      <h1 ref={titulo} tabIndex={-1} className="mt-4 text-titulo text-tinta outline-none">
        {PASOS[paso - 1]}
      </h1>

      {paso === 1 && (
        <form
          className="mt-4 space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (hayAlgo) setPaso(2);
          }}
        >
          <p className="text-base text-tinta-suave">Toca lo que pide tu cliente. Puedes elegir varias.</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Partes del sistema">
            {PARTES.map((p) => (
              <Pastilla key={p} activa={partes.includes(p)} onClick={() => alternar(p)}>
                {p}
              </Pastilla>
            ))}
          </div>
          <div className="space-y-1">
            <Label htmlFor="con-palabras" className="text-base">
              O cuéntalo en una línea (opcional)
            </Label>
            <Input
              id="con-palabras"
              value={conPalabras}
              onChange={(e) => setConPalabras(e.target.value)}
              maxLength={200}
              placeholder="Ej. Una clínica quiere que sus pacientes agenden desde el celular"
              className="h-12 text-base"
            />
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <button type="submit" disabled={!hayAlgo} className={botonPrincipal}>
              Siguiente
            </button>
            {!hayAlgo && <p className="text-base text-tinta-suave">Toca al menos una parte.</p>}
          </div>
          <p className="text-base text-tinta-suave">
            {ejemploId && (
              <>
                <Link href={`/projects/${ejemploId}`} className="font-semibold text-accion underline underline-offset-4">
                  Ver un ejemplo ya calculado
                </Link>
                {" · "}
              </>
            )}
            <Link href="/projects/new" className="font-semibold text-accion underline underline-offset-4">
              Prefiero capturar el proyecto completo
            </Link>
          </p>
        </form>
      )}

      {paso === 2 && (
        <div className="mt-4 space-y-6">
          <div className="grid gap-3 sm:grid-cols-2" role="group" aria-label="Quién lo hace">
            <Opcion
              activa={quien === "solo"}
              onClick={() => elegirQuien("solo")}
              titulo="Yo solo"
              detalle="Se cuenta lo que vale tu tiempo, 35,000 pesos al mes, sin nómina."
            />
            <Opcion
              activa={quien === "contrato"}
              onClick={() => elegirQuien("contrato")}
              titulo="Contrato a alguien"
              detalle="Sueldo con IMSS, vivienda e impuesto sobre nómina."
            />
          </div>

          {quien === "contrato" && (
            <div className="flex flex-wrap gap-2" role="group" aria-label="Con qué experiencia">
              <Pastilla activa={nivel === "senior"} onClick={() => setNivel("senior")}>
                Con experiencia, 30,000 al mes
              </Pastilla>
              <Pastilla activa={nivel === "junior"} onClick={() => setNivel("junior")}>
                Que apenas empieza, 15,000 al mes
              </Pastilla>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-base">¿Quien lo hace ya programa con IA?</Label>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Experiencia con la IA">
              {EXPERIENCIA_IA.map((o) => (
                <Pastilla key={o.v} activa={experienciaIA === o.v} onClick={() => setExperienciaIA(o.v)}>
                  {o.t}
                </Pastilla>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => setPaso(1)} className="inline-flex h-12 items-center rounded-lg border px-6 text-base font-semibold text-tinta hover:bg-papel">
              Atrás
            </button>
            <button type="button" onClick={() => setPaso(3)} className={botonPrincipal}>
              Siguiente
            </button>
          </div>
        </div>
      )}

      {paso === 3 && (
        <form
          className="mt-4 space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (!enviando) calcular();
          }}
        >
          <p className="text-base text-tinta-suave">Los dos son opcionales. Con ellos te dice si te alcanza y si llega a tiempo.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="presupuesto" className="text-base">
                Dinero del cliente (pesos, con IVA)
              </Label>
              <Input
                id="presupuesto"
                type="number"
                inputMode="numeric"
                min={0}
                step={1000}
                value={presupuesto}
                onChange={(e) => setPresupuesto(e.target.value)}
                placeholder="180000"
                className="h-12 text-base"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="fecha" className="text-base">
                Fecha límite
              </Label>
              <Input id="fecha" type="date" value={fechaLimite} onChange={(e) => setFechaLimite(e.target.value)} className="h-12 text-base" />
            </div>
          </div>

          <details className="rounded-lg border bg-lienzo">
            <summary className="cursor-pointer px-4 py-3 text-base font-semibold text-tinta">Afinar después (opcional)</summary>
            <div className="space-y-5 px-4 pb-4">
              <p className="text-base text-tinta-suave">Ya vienen con valores típicos. Cámbialos solo si los sabes.</p>
              <div className="space-y-2">
                <Label className="text-base">¿Quién resuelve las dudas de tu cliente?</Label>
                <div className="grid gap-2 sm:grid-cols-3" role="group" aria-label="Quién resuelve las dudas">
                  {DISPONIBILIDAD.map((d) => (
                    <Opcion key={d.value} activa={disponibilidad === d.value} onClick={() => setDisponibilidad(d.value)} titulo={d.label} detalle={d.detalle} />
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="personas" className="text-base">
                  ¿Cuántas personas lo van a usar?
                </Label>
                <Input
                  id="personas"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={personas}
                  onChange={(e) => setPersonas(e.target.value)}
                  placeholder="6"
                  className="h-12 text-base sm:max-w-[10rem]"
                />
              </div>
            </div>
          </details>

          {error && <p className="text-base text-amber-800">{error}</p>}

          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => setPaso(2)} disabled={enviando} className="inline-flex h-12 items-center rounded-lg border px-6 text-base font-semibold text-tinta hover:bg-papel disabled:opacity-50">
              Atrás
            </button>
            <button type="submit" disabled={enviando} className={botonPrincipal}>
              {enviando ? "Calculando las cinco formas..." : "Calcular"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
