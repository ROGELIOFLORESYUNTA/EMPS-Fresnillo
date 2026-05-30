"use client";
import { useEffect, useRef, useState } from "react";
import { Info, X, ExternalLink, FileText, AlertTriangle, BookOpen } from "lucide-react";
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

interface Props {
  parameterKey: string;
}

/**
 * Botón ⓘ que abre un panel lateral con el manual extendido del parámetro
 * (origen oficial, URL, qué afecta, checklist de modificación, referencias).
 *
 * Si no hay manual cargado para esta clave, muestra mensaje pidiéndole al
 * administrador que lo genere con ChatGPT Pro.
 */
export function ParameterManualSheet({ parameterKey }: Props) {
  const [open, setOpen] = useState(false);
  const [manual, setManual] = useState<ParameterManual | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch(`/api/parameter-manuals/${encodeURIComponent(parameterKey)}`)
      .then(async (r) => {
        const data = await r.json();
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
