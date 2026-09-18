"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiPost } from "@/lib/api-client";
import { DEVELOPMENT_MODES, formatMXN } from "@/lib/utils";

/**
 * Encuesta de salida del piloto: cuatro preguntas al pie del resultado.
 * Es el instrumento que da estadísticas de los dos lados (Ayuntamiento y
 * proveedor) sin esperar a que un proyecto termine: si la cifra les pareció
 * creíble, cuánto esperaban y qué forma de hacerlo usarían.
 */
const CREDIBILIDAD = [
  { v: 1, t: "No la creo" },
  { v: 2, t: "Me parece lejana" },
  { v: 3, t: "Más o menos" },
  { v: 4, t: "Se acerca" },
  { v: 5, t: "La creo del todo" },
];

export function EncuestaPiloto({ projectId, totalMostrado, modoLabel }: { projectId: string; totalMostrado: number; modoLabel: string }) {
  const inicio = useRef<number>(0);
  const [credibilidad, setCredibilidad] = useState<number | null>(null);
  const [cifra, setCifra] = useState("");
  const [forma, setForma] = useState<string>("");
  const [comentario, setComentario] = useState("");
  const [estado, setEstado] = useState<"abierta" | "enviando" | "gracias" | "ya">("abierta");
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

  async function enviar() {
    if (credibilidad == null) {
      setError("Dinos al menos qué tan creíble te pareció la cifra.");
      return;
    }
    setEstado("enviando");
    setError(null);
    try {
      await apiPost("/api/piloto", {
        projectId,
        credibilidad,
        cifraEsperada: cifra ? Number(cifra) : null,
        totalMostrado,
        formaQueUsaria: forma || null,
        comentario: comentario.trim() || null,
        segundosEnPantalla: Math.round((Date.now() - inicio.current) / 1000),
      });
      try {
        localStorage.setItem(llave, "1");
      } catch {
        // sin almacenamiento local
      }
      setEstado("gracias");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar. Intenta de nuevo.");
      setEstado("abierta");
    }
  }

  if (estado === "ya") return null;
  if (estado === "gracias") {
    return (
      <div className="rounded-lg border bg-green-50/60 border-green-200 p-4 text-sm text-green-900">
        Gracias. Tu respuesta se suma al piloto y ayuda a saber si las cifras del sistema se acercan a lo que pasa en la vida real.
      </div>
    );
  }

  return (
    <details className="rounded-lg border bg-muted/30">
      <summary className="cursor-pointer px-4 py-3 text-sm">
        <span className="font-medium">¿Nos ayudas con cuatro preguntas?</span>
        <span className="text-muted-foreground"> Treinta segundos. Sirven para la investigación y no piden tu nombre.</span>
      </summary>
      <div className="px-4 pb-4 space-y-4 text-sm">
        <div className="space-y-2">
          <Label>1. La cifra de arriba ({formatMXN(totalMostrado)}, {modoLabel}): ¿qué tan creíble te parece?</Label>
          <div className="grid grid-cols-5 gap-1">
            {CREDIBILIDAD.map((c) => (
              <button
                key={c.v}
                type="button"
                onClick={() => setCredibilidad(c.v)}
                className={`rounded-md border px-2 py-2 text-xs hover:bg-accent ${credibilidad === c.v ? "border-primary ring-1 ring-primary" : ""}`}
              >
                <span className="block font-semibold">{c.v}</span>
                {c.t}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor="cifra-esperada">2. Antes de ver el resultado, ¿cuánto pensabas que iba a costar o cobrar? (pesos, opcional)</Label>
          <Input id="cifra-esperada" type="number" min={0} step={1000} value={cifra} onChange={(e) => setCifra(e.target.value)} placeholder="por ejemplo 350000" />
        </div>
        <div className="space-y-2">
          <Label>3. ¿Con qué forma de hacerlo lo harías o lo pedirías?</Label>
          <div className="flex flex-wrap gap-1">
            {DEVELOPMENT_MODES.map((m) => (
              <button key={m.value} type="button" onClick={() => setForma(forma === m.value ? "" : m.value)} className={`rounded-full border px-3 py-1 text-xs hover:bg-accent ${forma === m.value ? "border-primary ring-1 ring-primary" : ""}`}>
                {m.label}
              </button>
            ))}
            <button type="button" onClick={() => setForma(forma === "no_se" ? "" : "no_se")} className={`rounded-full border px-3 py-1 text-xs hover:bg-accent ${forma === "no_se" ? "border-primary ring-1 ring-primary" : ""}`}>
              No sé
            </button>
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor="comentario-piloto">4. ¿Qué te faltó o qué no se entendió? (opcional)</Label>
          <Textarea id="comentario-piloto" rows={2} value={comentario} onChange={(e) => setComentario(e.target.value)} maxLength={600} />
        </div>
        {error && <p className="text-red-700">{error}</p>}
        <Button size="sm" onClick={enviar} disabled={estado === "enviando"}>
          {estado === "enviando" ? "Guardando..." : "Enviar respuestas"}
        </Button>
      </div>
    </details>
  );
}
