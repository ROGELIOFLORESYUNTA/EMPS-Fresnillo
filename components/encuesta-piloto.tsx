"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiPost } from "@/lib/api-client";
import { FORMAS_DE_HACERLO } from "@/lib/formas";
import { cn } from "@/lib/utils";
import { pesos } from "@/lib/graficas";

/**
 * Encuesta de salida del piloto. La primera pregunta, la credibilidad de la
 * cifra, va a la vista con sus cinco botones: un toque y ya se guardó. Las
 * otras tres (cuánto esperaba, con qué forma lo haría y qué faltó) quedan
 * plegadas y completan la misma respuesta, no crean otra.
 *
 * Es el instrumento que da estadísticas de los dos lados (Ayuntamiento y
 * proveedor) sin esperar a que un proyecto termine. Es anónima.
 */
const CREDIBILIDAD = [
  { v: 1, t: "No la creo" },
  { v: 2, t: "Me parece lejana" },
  { v: 3, t: "Más o menos" },
  { v: 4, t: "Se acerca" },
  { v: 5, t: "La creo del todo" },
];

type Estado = "abierta" | "guardando" | "completa" | "ya";

export function EncuestaPiloto({ projectId, totalMostrado, modoLabel }: { projectId: string; totalMostrado: number; modoLabel: string }) {
  const inicio = useRef<number>(0);
  const [credibilidad, setCredibilidad] = useState<number | null>(null);
  const [respuestaId, setRespuestaId] = useState<string | null>(null);
  const [cifra, setCifra] = useState("");
  const [forma, setForma] = useState<string>("");
  const [comentario, setComentario] = useState("");
  const [estado, setEstado] = useState<Estado>("abierta");
  const [guardada, setGuardada] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const llave = `emps:piloto:${projectId}`;

  useEffect(() => {
    inicio.current = Date.now();
    try {
      if (localStorage.getItem(llave)) setEstado("ya");
    } catch {
      // sin almacenamiento local: se muestra de todos modos
    }
  }, [llave]);

  /** Guarda la respuesta; si ya hay una, la completa en lugar de crear otra. */
  async function guardar(cred: number) {
    setEstado("guardando");
    setError(null);
    try {
      const r = await apiPost<{ id: string }>("/api/piloto", {
        id: respuestaId ?? undefined,
        projectId,
        credibilidad: cred,
        cifraEsperada: cifra ? Number(cifra) : null,
        totalMostrado,
        formaQueUsaria: forma || null,
        comentario: comentario.trim() || null,
        segundosEnPantalla: Math.round((Date.now() - inicio.current) / 1000),
      });
      setRespuestaId(r.id);
      setGuardada(true);
      try {
        localStorage.setItem(llave, "1");
      } catch {
        // sin almacenamiento local
      }
      setEstado("abierta");
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar. Intenta de nuevo.");
      setEstado("abierta");
      return false;
    }
  }

  async function elegir(v: number) {
    setCredibilidad(v);
    await guardar(v);
  }

  async function enviarTodo() {
    if (credibilidad == null) {
      setError("Primero toca un número arriba: qué tan creíble te pareció la cifra.");
      return;
    }
    if (await guardar(credibilidad)) setEstado("completa");
  }

  if (estado === "ya") return null;

  if (estado === "completa") {
    return (
      <section aria-live="polite" className="border-t pt-6">
        <p className="text-base text-tinta">
          Gracias. Tu respuesta se suma al piloto y ayuda a saber si las cifras del sistema se acercan a lo que pasa en la vida real.
        </p>
      </section>
    );
  }

  const boton = (activo: boolean) =>
    cn(
      "min-h-12 rounded-lg border text-base font-semibold transition-colors",
      activo ? "border-marino bg-marino text-white" : "bg-lienzo text-tinta hover:bg-papel",
    );

  return (
    <section aria-labelledby="pregunta-creible" className="border-t pt-6">
      <h2 id="pregunta-creible" className="text-seccion text-tinta">
        ¿Qué tan creíble te parece esta cifra?
      </h2>
      <p className="mt-1 text-base text-tinta-suave">
        {pesos(totalMostrado)}, {modoLabel}. Un toque basta; es anónimo y sirve para la investigación.
      </p>

      <div className="mt-3 grid grid-cols-5 gap-2" role="radiogroup" aria-label="Qué tan creíble te parece la cifra, de 1 a 5">
        {CREDIBILIDAD.map((c) => (
          <button
            key={c.v}
            type="button"
            role="radio"
            aria-checked={credibilidad === c.v}
            aria-label={`${c.v}: ${c.t}`}
            title={c.t}
            disabled={estado === "guardando"}
            onClick={() => elegir(c.v)}
            className={boton(credibilidad === c.v)}
          >
            {c.v}
            <span className="hidden px-1 pt-0.5 text-xs font-normal leading-tight sm:block">{c.t}</span>
          </button>
        ))}
      </div>
      <p className="mt-2 flex justify-between text-sm text-tinta-suave sm:hidden">
        <span>1: No la creo</span>
        <span>5: La creo del todo</span>
      </p>

      {guardada && (
        <p aria-live="polite" className="mt-3 text-base font-semibold text-marino">
          Gracias, ya quedó guardada tu respuesta.
        </p>
      )}
      {error && <p className="mt-3 text-base text-amber-800">{error}</p>}

      <details className="mt-3">
        <summary className="inline-flex min-h-11 cursor-pointer items-center text-base font-semibold text-accion underline-offset-4 hover:underline">
          {guardada ? "Cuéntanos más, son tres preguntas" : "Responder tres preguntas más (treinta segundos)"}
        </summary>
        <div className="space-y-5 pt-2 text-base">
          <div className="space-y-1">
            <Label htmlFor="cifra-esperada" className="text-base">
              Antes de ver el resultado, ¿cuánto pensabas que iba a costar o cobrar? (pesos, opcional)
            </Label>
            <Input id="cifra-esperada" type="number" min={0} step={1000} value={cifra} onChange={(e) => setCifra(e.target.value)} placeholder="por ejemplo 350000" />
          </div>
          <div className="space-y-2">
            <Label className="text-base">¿Con qué forma de hacerlo lo harías o lo pedirías?</Label>
            <div className="flex flex-wrap gap-2">
              {FORMAS_DE_HACERLO.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  title={f.tecnico}
                  onClick={() => setForma(forma === f.value ? "" : f.value)}
                  className={cn("min-h-11 rounded-full border px-4 text-base", forma === f.value ? "border-marino bg-marino text-white" : "bg-lienzo hover:bg-papel")}
                >
                  {f.nombre}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setForma(forma === "no_se" ? "" : "no_se")}
                className={cn("min-h-11 rounded-full border px-4 text-base", forma === "no_se" ? "border-marino bg-marino text-white" : "bg-lienzo hover:bg-papel")}
              >
                No sé
              </button>
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="comentario-piloto" className="text-base">
              ¿Qué te faltó o qué no se entendió? (opcional)
            </Label>
            <Textarea id="comentario-piloto" rows={2} value={comentario} onChange={(e) => setComentario(e.target.value)} maxLength={600} />
          </div>
          <Button onClick={enviarTodo} disabled={estado === "guardando"} className="h-11 bg-marino px-5 text-base hover:bg-marino/90">
            {estado === "guardando" ? "Guardando..." : "Enviar respuestas"}
          </Button>
        </div>
      </details>
    </section>
  );
}
