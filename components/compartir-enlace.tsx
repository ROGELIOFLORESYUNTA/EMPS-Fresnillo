"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Link2, Link2Off, Copy } from "lucide-react";
import { apiPost, apiDelete } from "@/lib/api-client";

/**
 * Compartir el resultado con alguien que no tiene cuenta (el director, el
 * proveedor): un enlace de solo lectura que se puede revocar.
 */
export function CompartirEnlace({ projectId, token: inicial }: { projectId: string; token: string | null }) {
  const [token, setToken] = useState<string | null>(inicial);
  const [ocupado, setOcupado] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const url = token && typeof window !== "undefined" ? `${window.location.origin}/r/${token}` : null;

  async function crear() {
    setOcupado(true);
    setError(null);
    try {
      const r = await apiPost<{ token: string }>(`/api/projects/${projectId}/share`, {});
      setToken(r.token);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear el enlace.");
    } finally {
      setOcupado(false);
    }
  }

  async function revocar() {
    setOcupado(true);
    setError(null);
    try {
      await apiDelete(`/api/projects/${projectId}/share`);
      setToken(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo quitar el enlace.");
    } finally {
      setOcupado(false);
    }
  }

  async function copiar() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setError("No se pudo copiar; selecciona el enlace y cópialo a mano.");
    }
  }

  if (!token) {
    return (
      <div className="inline-flex flex-col">
        <Button variant="outline" onClick={crear} disabled={ocupado}>
          <Link2 className="w-4 h-4 mr-2" />
          {ocupado ? "Creando enlace..." : "Compartir resultado"}
        </Button>
        {error && <p className="text-xs text-red-700 mt-1">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm">
      <span className="text-muted-foreground">Enlace de solo lectura:</span>
      <code className="text-xs break-all">{url ?? `/r/${token}`}</code>
      <Button size="sm" variant="outline" onClick={copiar}>
        <Copy className="w-3.5 h-3.5 mr-1" />
        {copiado ? "Copiado" : "Copiar"}
      </Button>
      <Button size="sm" variant="ghost" onClick={revocar} disabled={ocupado}>
        <Link2Off className="w-3.5 h-3.5 mr-1" />
        Dejar de compartir
      </Button>
      {error && <p className="text-xs text-red-700 basis-full">{error}</p>}
    </div>
  );
}
