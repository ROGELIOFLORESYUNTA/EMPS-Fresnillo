"use client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, LogOut } from "lucide-react";

/**
 * Ribbon dorado que aparece en TODAS las páginas cuando la cookie admin
 * está activa. Le muestra al investigador que sigue en modo investigador
 * y le da accesos rápidos al panel y a salir.
 */
export function AdminRibbon() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.refresh();
    router.push("/");
  }

  return (
    <div className="bg-amber-100 border-b border-amber-300 text-amber-950 text-xs no-print">
      <div className="max-w-6xl mx-auto px-6 py-1.5 flex items-center justify-between gap-3 flex-wrap">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span className="font-medium">Modo investigador activo</span>
          <span className="text-amber-800/70 hidden sm:inline">— estás viendo el sistema como administrador</span>
        </span>
        <span className="flex items-center gap-3">
          <Link
            href="/investigacion/admin-datos"
            className="underline hover:text-amber-900 font-medium"
          >
            Ir al panel
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1 hover:text-amber-900"
            title="Cerrar sesión de investigador (no afecta tu workspace)"
          >
            <LogOut className="w-3 h-3" />
            Salir
          </button>
        </span>
      </div>
    </div>
  );
}
