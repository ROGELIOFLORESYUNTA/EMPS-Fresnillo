"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Info } from "lucide-react";

/**
 * Icono ⓘ que despliega una explicación corta al hacer click.
 * Pensado para acompañar números importantes del proyecto y mostrar
 * de dónde salen (fórmula, fuente o referencia legal).
 *
 * Posiciona el panel con `position: fixed` y se ajusta para no salirse
 * de la pantalla (mide el ancho real del panel y mueve la coordenada x
 * hasta que entra completo en el viewport).
 *
 * Cumple criterio 11 de aceptación: el sistema explica los riesgos y
 * cifras en lenguaje entendible para el operador.
 */
export function InfoTip({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (
        !triggerRef.current?.contains(t) &&
        !panelRef.current?.contains(t)
      ) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onResize() {
      setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [open]);

  // Posicionar el panel con respecto al trigger, ajustando para no salir del viewport.
  useLayoutEffect(() => {
    if (!open || !triggerRef.current || !panelRef.current) return;
    const t = triggerRef.current.getBoundingClientRect();
    const p = panelRef.current.getBoundingClientRect();
    const margin = 8;
    let left = t.left;
    if (left + p.width + margin > window.innerWidth) {
      left = window.innerWidth - p.width - margin;
    }
    if (left < margin) left = margin;
    let top = t.bottom + 6;
    if (top + p.height + margin > window.innerHeight) {
      top = t.top - p.height - 6; // voltea hacia arriba si no cabe abajo
      if (top < margin) top = margin;
    }
    setCoords({ top, left });
  }, [open]);

  return (
    <span ref={wrapRef} className="relative inline-block align-middle">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((s) => !s)}
        className="inline-flex items-center justify-center w-4 h-4 ml-1 text-muted-foreground hover:text-foreground rounded-full focus:outline-none focus:ring-1 focus:ring-primary"
        aria-label="¿De dónde sale este número?"
        aria-expanded={open}
      >
        <Info className="w-3.5 h-3.5" />
      </button>
      {open && (
        <div
          ref={panelRef}
          role="dialog"
          style={{
            position: "fixed",
            top: coords?.top ?? -9999,
            left: coords?.left ?? -9999,
            visibility: coords ? "visible" : "hidden",
          }}
          className="z-[1000] w-80 max-w-[calc(100vw-1rem)] p-3 rounded-md border bg-white text-foreground shadow-xl text-xs leading-relaxed whitespace-normal"
        >
          {title && <p className="font-semibold mb-1 text-foreground">{title}</p>}
          <div className="text-muted-foreground space-y-2">{children}</div>
        </div>
      )}
    </span>
  );
}
