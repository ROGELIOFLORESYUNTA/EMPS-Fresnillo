"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { User2, UserCircle2 } from "lucide-react";

interface MyAccountInfo {
  id: string;
  displayName: string | null;
  role: string | null;
  recoveryCode: string | null;
}

/**
 * Mini badge en el header.
 * - Si el visitante ya se identificó: muestra su nombre.
 * - Si no se ha identificado: muestra "Anónimo · Identifícate" en ámbar para
 *   invitar a hacer click, pero SOLO cuando ya tiene algún proyecto propio.
 *   Antes de eso no hay nada que reconocer y la pastilla solo estorba.
 * Click va a /mi-cuenta (alias visible de /mi-workspace).
 *
 * Se vuelve a consultar en cada cambio de página: el encabezado no se
 * recarga al navegar, y así la pastilla aparece justo después de crear el
 * primer proyecto.
 */
export function WorkspaceBadge() {
  const [me, setMe] = useState<MyAccountInfo | null>(null);
  const [proyectos, setProyectos] = useState(0);
  const pathname = usePathname();

  const fetchMe = useCallback(
    () =>
      fetch("/api/workspace/me")
        .then((r) => r.json())
        .then((d) => {
          setMe(d.workspace);
          setProyectos(Number(d.proyectos) || 0);
        })
        .catch(() => {}),
    [],
  );

  useEffect(() => {
    fetchMe();
  }, [fetchMe, pathname]);

  useEffect(() => {
    // Refresca cuando /mi-cuenta dispara este evento tras guardar
    window.addEventListener("emps:identity-changed", fetchMe);
    return () => window.removeEventListener("emps:identity-changed", fetchMe);
  }, [fetchMe]);

  if (!me) return null;

  const identified = !!me.displayName;
  if (!identified && proyectos === 0) return null;

  return (
    <Link
      href="/mi-cuenta"
      className={`inline-flex items-center gap-1.5 text-xs rounded-full px-2.5 py-1 transition-colors border ${
        identified
          ? "text-foreground hover:bg-accent border-border"
          : "text-amber-900 bg-amber-50 hover:bg-amber-100 border-amber-300"
      }`}
      title={identified ? "Tu cuenta en este sitio. Click para cambiar tu nombre o ver tu llave." : "Estás navegando como anónimo. Click para identificarte y guardar tus datos."}
    >
      {identified ? <User2 className="w-3.5 h-3.5" /> : <UserCircle2 className="w-3.5 h-3.5" />}
      <span className="font-medium">{me.displayName ?? "Anónimo"}</span>
      {!identified && <span className="text-[10px] uppercase tracking-wide hidden sm:inline">Identifícate</span>}
    </Link>
  );
}
