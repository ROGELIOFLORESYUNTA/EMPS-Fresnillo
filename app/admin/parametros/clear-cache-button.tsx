"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle2 } from "lucide-react";
import { apiPost } from "@/lib/api-client";

export function ClearCacheButton() {
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");

  async function handle() {
    setStatus("loading");
    try {
      await apiPost("/api/parameters/revalidate-change-cache", {});
      setStatus("ok");
      setTimeout(() => setStatus("idle"), 3000);
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handle} disabled={status === "loading"} title="Invalida la caché de parámetros del motor v7 para que los próximos cálculos lean valores frescos">
      {status === "ok" ? (
        <>
          <CheckCircle2 className="w-4 h-4 mr-2 text-green-600" />Caché limpiada
        </>
      ) : (
        <>
          <RefreshCw className={`w-4 h-4 mr-2 ${status === "loading" ? "animate-spin" : ""}`} />Limpiar caché de cambios v7
        </>
      )}
    </Button>
  );
}
