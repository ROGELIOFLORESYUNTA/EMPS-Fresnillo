"use client";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

/**
 * Editor para parámetros tipo tabla (JSON): cada número se edita en su propio
 * campo con una etiqueta legible; los textos (fuentes, evidencia, notas) se
 * muestran como referencia y no se tocan. Guarda el JSON completo, así que el
 * override del workspace conserva las fuentes junto con el valor editado.
 */

const SEGMENTOS: Record<string, string> = {
  traditional: "a mano",
  ai_assisted: "con ayuda de IA",
  hybrid: "híbrido",
  bytecoding_prompts: "casi todo con IA",
  low_code: "plataforma de armado",
  por_modo: "",
  usd_por_persona_mes: "USD por persona al mes (nivel típico)",
  sobreconsumo: "sobreconsumo (0.3 = 30 %)",
  usd_por_usuario_final_mes: "USD por usuario final al mes",
  usuarios_finales_supuestos: "usuarios finales que se asumen",
  niveles: "nivel",
  basico: "básico (USD por persona al mes)",
  tipico: "típico (USD por persona al mes)",
  maximo: "máximo (USD por persona al mes)",
  velocity_factor: "velocidad de calendario",
  prototype_speedup: "aceleración a prototipo",
  hardening_overhead: "endurecimiento",
  effort_efficiency: "horas respecto a hacerlo a mano",
  prototype_quality_factor: "calidad del prototipo",
  optimistic: "si todo sale bien",
  probable: "lo más seguro",
  conservative_min: "si hay tropiezos (mínimo)",
  conservative_max: "si hay tropiezos (máximo)",
  coding: "programar",
  review: "revisar",
  testing: "probar",
  documentation: "documentar",
  deployment: "poner en marcha",
  management: "gestión",
  hardening: "endurecer",
};

const NIVELES_PERICIA: Record<string, string> = {
  "1": "nivel 1 (nunca ha usado IA)",
  "2": "nivel 2 (la ha probado)",
  "3": "nivel 3 (la usa en algunos proyectos)",
  "4": "nivel 4 (la usa a diario)",
  "5": "nivel 5 (arma flujos con agentes)",
};

function etiqueta(ruta: string[]): string {
  return ruta
    .filter((s) => !s.startsWith("_"))
    .map((s) => (SEGMENTOS[s] !== undefined ? SEGMENTOS[s] : NIVELES_PERICIA[s] ?? s.replace(/_/g, " ")))
    .filter(Boolean)
    .join(" · ");
}

interface Campo {
  ruta: string[];
  valor: number;
}

function recolectar(obj: unknown, ruta: string[], campos: Campo[], textos: Array<{ ruta: string[]; texto: string }>) {
  if (typeof obj === "number") {
    campos.push({ ruta, valor: obj });
    return;
  }
  if (typeof obj === "string") {
    if (ruta.length > 0 && !ruta[ruta.length - 1].startsWith("_")) textos.push({ ruta, texto: obj });
    return;
  }
  if (Array.isArray(obj)) return;
  if (obj && typeof obj === "object") {
    for (const [k, v] of Object.entries(obj)) {
      if (k.startsWith("_")) continue;
      recolectar(v, [...ruta, k], campos, textos);
    }
  }
}

function asignar(obj: Record<string, unknown>, ruta: string[], valor: number) {
  let cursor: Record<string, unknown> = obj;
  for (let i = 0; i < ruta.length - 1; i++) cursor = cursor[ruta[i]] as Record<string, unknown>;
  cursor[ruta[ruta.length - 1]] = valor;
}

export function EditorTablaParametro({ valor, onChange }: { valor: string; onChange: (json: string) => void }) {
  const [verJson, setVerJson] = useState(false);
  const parsed = useMemo(() => {
    try {
      return JSON.parse(valor) as Record<string, unknown>;
    } catch {
      return null;
    }
  }, [valor]);

  if (!parsed || typeof parsed !== "object") {
    return (
      <Textarea rows={8} className="font-mono text-xs" value={valor} onChange={(e) => onChange(e.target.value)} />
    );
  }

  const campos: Campo[] = [];
  const textos: Array<{ ruta: string[]; texto: string }> = [];
  recolectar(parsed, [], campos, textos);
  const fuentes = Object.entries(parsed).filter(([k]) => k.startsWith("_"));

  function cambiar(c: Campo, texto: string) {
    const n = Number(texto);
    if (!Number.isFinite(n)) return;
    const copia = JSON.parse(JSON.stringify(parsed)) as Record<string, unknown>;
    asignar(copia, c.ruta, n);
    onChange(JSON.stringify(copia, null, 2));
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        {campos.map((c) => (
          <label key={c.ruta.join(".")} className="grid gap-1 text-xs">
            <span className="text-muted-foreground">{etiqueta(c.ruta)}</span>
            <Input type="number" step="any" value={c.valor} onChange={(e) => cambiar(c, e.target.value)} className="h-8 text-sm" />
          </label>
        ))}
      </div>
      {textos.length > 0 && (
        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground">Descripciones y evidencia por renglón (no se editan aquí)</summary>
          <ul className="mt-1 space-y-1 text-muted-foreground">
            {textos.map((t) => (
              <li key={t.ruta.join(".")}><strong>{etiqueta(t.ruta)}:</strong> {t.texto}</li>
            ))}
          </ul>
        </details>
      )}
      {fuentes.length > 0 && (
        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground">Fuentes y notas del parámetro</summary>
          <ul className="mt-1 space-y-1 text-muted-foreground">
            {fuentes.map(([k, v]) => (
              <li key={k}><strong>{k.replace(/^_/, "").replace(/_/g, " ")}:</strong> {Array.isArray(v) ? v.join(" · ") : typeof v === "object" ? JSON.stringify(v) : String(v)}</li>
            ))}
          </ul>
        </details>
      )}
      <button type="button" className="text-xs underline text-muted-foreground" onClick={() => setVerJson((v) => !v)}>
        {verJson ? "Ocultar el JSON" : "Ver o pegar el JSON completo"}
      </button>
      {verJson && <Textarea rows={10} className="font-mono text-xs" value={valor} onChange={(e) => onChange(e.target.value)} />}
    </div>
  );
}
