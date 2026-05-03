"use client";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { DEVELOPMENT_MODES, SCENARIOS } from "@/lib/utils";

/**
 * Selector que cambia la URL con searchParams (?mode=hybrid&scenario=probable).
 * El servidor re-renderiza usando esos params y muestra el modo+escenario seleccionado
 * en las tarjetas principales del proyecto.
 */
export function ModeScenarioSelector({
  currentMode,
  currentScenario,
}: {
  currentMode: string;
  currentScenario: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function update(key: "mode" | "scenario", value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-end gap-3 p-3 bg-muted/40 rounded-lg border">
      <div className="flex-1 min-w-[200px] grid gap-1">
        <Label className="text-xs text-muted-foreground">Ver tarjetas según el modo</Label>
        <Select
          value={currentMode}
          onChange={(e) => update("mode", e.target.value)}
          className="h-9"
        >
          {DEVELOPMENT_MODES.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </Select>
      </div>
      <div className="flex-1 min-w-[200px] grid gap-1">
        <Label className="text-xs text-muted-foreground">Escenario</Label>
        <Select
          value={currentScenario}
          onChange={(e) => update("scenario", e.target.value)}
          className="h-9"
        >
          {SCENARIOS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </Select>
      </div>
      <p className="text-xs text-muted-foreground basis-full">
        Cambia el modo y el escenario para ver cómo varían las tarjetas. La tabla del comparador (abajo) siempre muestra los 5 modos × 3 escenarios.
      </p>
    </div>
  );
}
