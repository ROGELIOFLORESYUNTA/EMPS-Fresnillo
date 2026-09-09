import { describe, it, expect } from "vitest";
import { tiempoPrimeraCifra, mediana } from "@/lib/tiempo-primera-cifra";

const t0 = new Date("2026-09-09T10:00:00Z");
const min = (m: number) => new Date(t0.getTime() + m * 60000);
const ev = (eventType: string, m: number, payload: Record<string, unknown>) => ({ eventType, payloadJson: JSON.stringify(payload), createdAt: min(m) });

describe("tiempo de la primera cifra", () => {
  it("mediana simple", () => {
    expect(mediana([])).toBeNull();
    expect(mediana([5])).toBe(5);
    expect(mediana([1, 10, 3])).toBe(3);
    expect(mediana([1, 2, 3, 4])).toBe(2.5);
  });

  it("separa quien llega a la cifra, quien se queda a medias y quien elige", () => {
    const r = tiempoPrimeraCifra([
      // A: flujo completo, 30 minutos a la cifra, elige a los 45
      ev("project_created", 0, { projectId: "A" }),
      ev("estimate_run", 30, { projectId: "A", mode: "hybrid" }),
      ev("estimate_run", 31, { projectId: "A", mode: "low_code" }),
      ev("option_chosen", 45, { projectId: "A" }),
      // B: cotizacion rapida, 1 minuto a la cifra, no elige
      ev("project_created", 100, { projectId: "B", origen: "cotizacion_rapida" }),
      ev("estimate_run", 101, { projectId: "B", mode: "todos" }),
      ev("cotizacion_rapida", 101, { projectId: "B", segundosEnLlenar: 48 }),
      // C: creado y abandonado
      ev("project_created", 200, { projectId: "C" }),
      // D: estimacion de un proyecto que no se vio nacer (no cuenta)
      ev("estimate_run", 300, { projectId: "D" }),
    ]);
    expect(r.proyectosCreados).toBe(3);
    expect(r.conCifra).toBe(2);
    expect(r.sinCifra).toBe(1);
    expect(r.conEleccion).toBe(1);
    expect(r.conCifraSinEleccion).toBe(1);
    expect(r.medianaMinutosACifra).toBe(15.5);
    expect(r.medianaMinutosAEleccion).toBe(45);
    expect(r.rapida.proyectos).toBe(1);
    expect(r.rapida.medianaMinutosACifra).toBe(1);
    expect(r.rapida.medianaSegundosEnLlenar).toBe(48);
    expect(r.completo.proyectos).toBe(2);
    expect(r.completo.medianaMinutosACifra).toBe(30);
  });

  it("ignora eventos sin proyecto o con carga ilegible", () => {
    const r = tiempoPrimeraCifra([
      { eventType: "project_created", payloadJson: "{no es json", createdAt: t0 },
      { eventType: "project_created", payloadJson: null, createdAt: t0 },
    ]);
    expect(r.proyectosCreados).toBe(0);
    expect(r.medianaMinutosACifra).toBeNull();
  });
});
