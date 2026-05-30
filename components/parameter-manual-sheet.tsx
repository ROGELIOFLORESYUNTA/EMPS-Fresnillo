"use client";
import { useEffect, useRef, useState } from "react";
import { Info, X, ExternalLink, FileText, AlertTriangle, BookOpen, Calculator } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ParameterManual {
  parameterKey: string;
  title: string;
  originSource: string | null;
  originUrl: string | null;
  originDocument: string | null;
  whatItAffects: string | null;
  howToModify: string | null;
  referencesMarkdown: string | null;
  lastReviewedAt: string | null;
  sourceTrustLevel: string;
}

interface ParameterRow {
  id: string;
  value: string | null;
  unit: string;
  base: string | null;
  source: string;
  sourceUrl: string | null;
  notes: string | null;
  year: number;
  effectiveFrom: string;
}

interface Props {
  parameterKey: string;
}

/**
 * Botón ⓘ que abre un panel lateral con el manual extendido del parámetro
 * (origen oficial, URL, qué afecta, checklist de modificación, referencias).
 *
 * Si no hay manual cargado para esta clave, muestra mensaje pidiéndole al
 * administrador que lo cargue.
 */
export function ParameterManualSheet({ parameterKey }: Props) {
  const [open, setOpen] = useState(false);
  const [manual, setManual] = useState<ParameterManual | null>(null);
  const [parameter, setParameter] = useState<ParameterRow | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch(`/api/parameter-manuals/${encodeURIComponent(parameterKey)}`)
      .then(async (r) => {
        const data = await r.json();
        setParameter(data.parameter ?? null);
        if (r.ok) {
          setManual(data.manual);
          setMessage(null);
        } else {
          setManual(null);
          setMessage(data.message ?? "No se pudo cargar el manual.");
        }
      })
      .catch(() => setMessage("Error de red al cargar el manual."))
      .finally(() => setLoading(false));
  }, [open, parameterKey]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center w-5 h-5 ml-1 text-muted-foreground hover:text-blue-700 rounded-full focus:outline-none focus:ring-1 focus:ring-primary"
        title={`Manual del parámetro ${parameterKey}`}
        aria-label={`Manual del parámetro ${parameterKey}`}
      >
        <Info className="w-4 h-4" />
      </button>
      {open && (
        <div
          className="fixed inset-0 z-[1000] flex justify-end"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="absolute inset-0 bg-black/40" />
          <div
            ref={ref}
            className="relative w-full max-w-xl bg-white shadow-2xl overflow-y-auto"
            role="dialog"
          >
            <div className="sticky top-0 bg-white border-b px-5 py-3 flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Manual del parámetro</p>
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                  {manual?.title ?? parameterKey}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">{parameterKey}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5 text-sm">
              {loading && <p className="text-muted-foreground">Cargando manual...</p>}

              {!loading && message && (
                <div className="border border-amber-300 bg-amber-50 rounded-md p-3 text-amber-900">
                  <p className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 mt-0.5" />
                    <span>{message}</span>
                  </p>
                </div>
              )}

              {!loading && parameter && (
                <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-4">
                  <p className="text-xs font-semibold text-blue-900 uppercase tracking-wide mb-1">
                    Valor actual configurado
                  </p>
                  <p className="text-2xl font-bold font-mono text-blue-950 break-all">
                    {formatValue(parameter.value, parameter.unit)}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
                    <Badge variant="secondary" className="text-xs">
                      Unidad: {parameter.unit}
                    </Badge>
                    {parameter.base && (
                      <Badge variant="secondary" className="text-xs">
                        Base: {parameter.base}
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs">
                      Año {parameter.year}
                    </Badge>
                  </div>
                </div>
              )}

              {!loading && parameter && (parameter.source || parameter.notes) && (
                <Section
                  icon={<Calculator className="w-4 h-4 text-purple-600" />}
                  title="Cómo se obtuvo este número"
                >
                  {parameter.source && (
                    <p>
                      <span className="font-medium text-foreground">Fuente registrada:</span>{" "}
                      {parameter.source}
                    </p>
                  )}
                  {parameter.notes && (
                    <p className="mt-2">
                      <span className="font-medium text-foreground">Operación / derivación:</span>{" "}
                      {parameter.notes}
                    </p>
                  )}
                  {parameter.sourceUrl && (
                    <a
                      href={parameter.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-700 hover:underline text-xs inline-flex items-center gap-1 mt-2"
                    >
                      Ver fuente registrada <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </Section>
              )}

              {!loading && manual && (
                <>
                  {manual.sourceTrustLevel && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground">Nivel de confianza de la fuente:</span>
                      <Badge
                        variant="outline"
                        className={
                          manual.sourceTrustLevel === "oficial"
                            ? "text-green-700 border-green-300"
                            : manual.sourceTrustLevel === "secundaria"
                              ? "text-amber-700 border-amber-300"
                              : "text-muted-foreground"
                        }
                      >
                        {manual.sourceTrustLevel}
                      </Badge>
                    </div>
                  )}

                  {manual.originSource && (
                    <Section icon={<FileText className="w-4 h-4 text-blue-600" />} title="De dónde viene">
                      <p>{manual.originSource}</p>
                      {manual.originDocument && (
                        <p className="text-xs text-muted-foreground mt-1">{manual.originDocument}</p>
                      )}
                      {manual.originUrl && (
                        <a
                          href={manual.originUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-700 hover:underline text-xs inline-flex items-center gap-1 mt-2"
                        >
                          Ver fuente oficial <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </Section>
                  )}

                  {manual.whatItAffects && (
                    <Section title="Qué afecta si lo cambias">
                      <Markdown text={manual.whatItAffects} />
                    </Section>
                  )}

                  {manual.howToModify && (
                    <Section icon={<AlertTriangle className="w-4 h-4 text-orange-600" />} title="Antes de modificar verifica">
                      <Markdown text={manual.howToModify} />
                    </Section>
                  )}

                  {manual.referencesMarkdown && (
                    <Section title="Referencias adicionales">
                      <Markdown text={manual.referencesMarkdown} />
                    </Section>
                  )}

                  {manual.lastReviewedAt && (
                    <p className="text-[10px] text-muted-foreground italic border-t pt-3">
                      Última revisión del manual: {new Date(manual.lastReviewedAt).toLocaleDateString("es-MX")}.
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h4 className="font-semibold mb-2 flex items-center gap-2">
        {icon}
        {title}
      </h4>
      <div className="text-sm text-muted-foreground leading-relaxed">{children}</div>
    </div>
  );
}

/**
 * Formatea el valor para humano según el tipo de unidad.
 */
function formatValue(value: string | null, unit: string): string {
  if (value == null || value === "") return "—";
  if (unit === "json" || unit === "table") {
    try {
      const obj = JSON.parse(value);
      const num = typeof obj === "object" && obj !== null && "value" in obj ? obj.value : null;
      if (typeof num === "number") return String(num);
      return "(tabla / objeto — abrir para editar detalles)";
    } catch {
      return value.length > 60 ? value.slice(0, 60) + "…" : value;
    }
  }
  if (unit === "rate") {
    const n = Number(value);
    if (Number.isFinite(n)) return `${value}  (${(n * 100).toFixed(4)}%)`;
  }
  if (unit === "MXN") {
    const n = Number(value);
    if (Number.isFinite(n)) return `$${n.toLocaleString("es-MX", { maximumFractionDigits: 2 })} MXN`;
  }
  return value;
}

/**
 * Renderizador mínimo de markdown: bullets, líneas, énfasis simples.
 * No usamos una librería completa para mantener el bundle pequeño.
 */
function Markdown({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={i} className="h-2" />;
        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          return (
            <div key={i} className="flex gap-2">
              <span className="text-blue-600">•</span>
              <span>{trimmed.slice(2)}</span>
            </div>
          );
        }
        return <p key={i}>{trimmed}</p>;
      })}
    </div>
  );
}
