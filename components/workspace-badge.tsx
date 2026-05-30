"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { User2 } from "lucide-react";

interface WorkspaceMe {
  id: string;
  displayName: string | null;
  role: string | null;
  recoveryCode: string | null;
}

/**
 * Mini badge en el header que muestra el nombre del workspace actual.
 * Si no tiene displayName, sugiere ponerle uno. Click → /mi-workspace.
 */
export function WorkspaceBadge() {
  const [ws, setWs] = useState<WorkspaceMe | null>(null);

  useEffect(() => {
    fetch("/api/workspace/me")
      .then((r) => r.json())
      .then((d) => setWs(d.workspace))
      .catch(() => {});
  }, []);

  if (!ws) return null;
  const label = ws.displayName ?? "Sin nombre";
  return (
    <Link
      href="/mi-workspace"
      className="hidden md:inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-full px-2.5 py-1 transition-colors"
      title="Identidad de este navegador. Click para cambiarla."
    >
      <User2 className="w-3 h-3" />
      <span className="font-medium">{label}</span>
      {!ws.displayName && <span className="text-[10px] text-amber-700">Ponle nombre</span>}
    </Link>
  );
}
