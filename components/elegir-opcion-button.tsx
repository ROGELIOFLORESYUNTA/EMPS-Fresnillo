"use client";
/**
 * Botón "Elegir esta opción como mi decisión".
 * Registra en la base la opción (modo × escenario) con la foto de sus cifras
 * de hoy, para que después el sistema pueda mostrar qué se modificó y cuánto
 * se movió el precio desde que se decidió.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle2 } from "lucide-react";
import { apiPost } from "@/lib/api-client";

export function ElegirOpcionButton({
  projectId,
  mode,
  scenario,
  modeLabel,
  scenarioLabel,
  recommendedMode,
  recommendedScenario,
  variant = "recomendada",
}: {
  projectId: string;
  mode: string;
  scenario: string;
  modeLabel: string;
  scenarioLabel: string;
  recommendedMode?: string;
  recommendedScenario?: string;
  variant?: "recomendada" | "actual";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [decidedByName, setDecidedByName] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setBusy(true);
    setError(null);
    try {
      await apiPost(`/api/projects/${projectId}/decision`, {
        mode,
        scenario,
        decidedByName: decidedByName || undefined,
        note: note || undefined,
        recommendedMode,
        recommendedScenario,
      });
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar la decisión. Intenta de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        <CheckCircle2 className="w-4 h-4 mr-1.5" />
        {variant === "recomendada" ? "Elegir esta opción como mi decisión" : "Elegir la opción que estoy viendo"}
      </Button>
    );
  }

  return (
    <div className="rounded-md border bg-background p-3 space-y-3 w-full max-w-md">
      <p className="text-sm">
        Vas a registrar tu decisión: <strong>{modeLabel}</strong> · escenario <strong>{scenarioLabel}</strong>.
      </p>
      <p className="text-xs text-muted-foreground">
        Se guarda la opción con sus cifras de hoy. Si después recalculas o pides cambios, el sistema te muestra qué tanto se movió.
      </p>
      <div className="grid gap-1.5">
        <Label htmlFor="decidedBy">¿Quién decide? (opcional)</Label>
        <Input id="decidedBy" value={decidedByName} maxLength={120} placeholder="ej. Dirección de Innovación" onChange={(e) => setDecidedByName(e.target.value)} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="decisionNote">Nota (opcional): por qué eliges esta opción</Label>
        <Textarea id="decisionNote" value={note} maxLength={2000} rows={2} placeholder="ej. Cabe en el presupuesto de este año y el riesgo es manejable" onChange={(e) => setNote(e.target.value)} />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2 justify-end">
        <Button size="sm" variant="outline" onClick={() => setOpen(false)} disabled={busy}>
          Cancelar
        </Button>
        <Button size="sm" onClick={handleConfirm} disabled={busy}>
          {busy ? "Guardando…" : "Confirmar decisión"}
        </Button>
      </div>
    </div>
  );
}
