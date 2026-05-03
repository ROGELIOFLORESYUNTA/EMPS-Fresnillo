"use client";
import { useEffect, useRef, useState } from "react";
import { Info } from "lucide-react";

/**
 * Icono ⓘ que despliega una explicación corta al hacer click.
 * Pensado para acompañar números importantes del proyecto y mostrar
 * de dónde salen (fórmula, fuente o referencia legal).
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
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <span ref={ref} className="relative inline-block align-middle">
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        className="inline-flex items-center justify-center w-4 h-4 ml-1 text-muted-foreground hover:text-foreground rounded-full focus:outline-none focus:ring-1 focus:ring-primary"
        aria-label="¿De dónde sale este número?"
        aria-expanded={open}
      >
        <Info className="w-3.5 h-3.5" />
      </button>
      {open && (
        <span
          role="dialog"
          className="absolute z-50 left-0 top-full mt-1 w-72 p-3 rounded-md border bg-popover text-popover-foreground shadow-lg text-xs leading-relaxed whitespace-normal"
        >
          {title && <span className="block font-semibold mb-1">{title}</span>}
          <span className="block text-muted-foreground">{children}</span>
        </span>
      )}
    </span>
  );
}
