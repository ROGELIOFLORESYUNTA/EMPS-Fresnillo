"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { User2, UserCircle2 } from "lucide-react";

interface MyAccountInfo {
  id: string;
  displayName: string | null;
  role: string | null;
  recoveryCode: string | null;
}

/**
 * Mini badge en el header.
 * - Si el visitante no se ha identificado: muestra "Anónimo · Identifícate"
 *   con color ámbar para invitar a hacer click.
 * - Si ya se identificó: muestra su nombre.
 * Click va a /mi-cuenta (alias visible de /mi-workspace).
 */
export function WorkspaceBadge() {
  const [me, setMe] = useState<MyAccountInfo | null>(null);

  useEffect(() => {
    const fetchMe = () =>
      fetch("/api/workspace/me")
        .then((r) => r.json())
        .then((d) => setMe(d.workspace))
        .catch(() => {});
    fetchMe();
    // Refresca cuando /mi-cuenta dispara este evento tras guardar
    window.addEventListener("emps:identity-changed", fetchMe);
    return () => window.removeEventListener("emps:identity-changed", fetchMe);
  }, []);

  if (!me) return null;

  const identified = !!me.displayName;
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
