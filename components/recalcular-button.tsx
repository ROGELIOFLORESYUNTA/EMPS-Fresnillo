"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { apiPost } from "@/lib/api-client";

export function RecalcularButton({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    if (!confirm("Recalcular este proyecto con los parámetros vigentes. Se crea una nueva versión y la anterior queda en el historial. ¿Continuar?")) return;
    setBusy(true);
    try {
      await apiPost(`/api/projects/${projectId}/recalculate-with-current-parameters`, {});
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error al recalcular");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button variant="outline" onClick={handleClick} disabled={busy}>
      <RefreshCw className={`w-4 h-4 mr-2 ${busy ? "animate-spin" : ""}`} />
      {busy ? "Recalculando…" : "Recalcular con parámetros vigentes"}
    </Button>
  );
}
