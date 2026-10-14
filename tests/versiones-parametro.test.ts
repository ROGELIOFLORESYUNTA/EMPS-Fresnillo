/**
 * Versiones de un parámetro (lib/versiones-parametro.ts): un precio que se
 * vuelve a consultar con otra fecha no debe dejar dos valores en juego.
 */
import { describe, it, expect } from "vitest";
import { unaVersionPorClave } from "@/lib/versiones-parametro";

const d = (s: string) => new Date(`${s}T00:00:00Z`);
const AHORA = d("2026-10-14");

describe("una versión por clave", () => {
  it("con una sola fila por clave no cambia nada", () => {
    const filas = [
      { key: "A", effectiveFrom: d("2026-01-01"), effectiveUntil: null },
      { key: "B", effectiveFrom: d("2026-01-01"), effectiveUntil: null },
    ];
    expect(unaVersionPorClave(filas, AHORA)).toEqual(filas);
  });

  it("entre dos versiones cuenta la más nueva, aunque la vieja haya llegado primero", () => {
    const vieja = { key: "AI_TOOL_COSTS", effectiveFrom: d("2026-09-09"), effectiveUntil: null, v: "vieja" };
    const nueva = { key: "AI_TOOL_COSTS", effectiveFrom: d("2026-10-13"), effectiveUntil: null, v: "nueva" };
    expect(unaVersionPorClave([vieja, nueva], AHORA)).toEqual([nueva]);
    expect(unaVersionPorClave([nueva, vieja], AHORA)).toEqual([nueva]);
  });

  it("la versión cerrada (con fecha de fin pasada) no cuenta si hay otra vigente", () => {
    const cerrada = { key: "K", effectiveFrom: d("2026-10-01"), effectiveUntil: d("2026-10-05"), v: "cerrada" };
    const vigente = { key: "K", effectiveFrom: d("2026-09-01"), effectiveUntil: null, v: "vigente" };
    expect(unaVersionPorClave([cerrada, vigente], AHORA)).toEqual([vigente]);
  });

  it("una versión que todavía no empieza no le gana a la que ya rige", () => {
    const futura = { key: "K", effectiveFrom: d("2026-12-01"), effectiveUntil: null, v: "futura" };
    const actual = { key: "K", effectiveFrom: d("2026-01-01"), effectiveUntil: null, v: "actual" };
    expect(unaVersionPorClave([futura, actual], AHORA)).toEqual([actual]);
  });

  it("si ninguna rige hoy, queda la más nueva", () => {
    const a = { key: "K", effectiveFrom: d("2026-01-01"), effectiveUntil: d("2026-02-01"), v: "a" };
    const b = { key: "K", effectiveFrom: d("2026-03-01"), effectiveUntil: d("2026-04-01"), v: "b" };
    expect(unaVersionPorClave([a, b], AHORA)).toEqual([b]);
  });

  it("conserva el orden de las filas y no mezcla claves", () => {
    const filas = [
      { key: "A", effectiveFrom: d("2026-01-01"), effectiveUntil: null, v: "A1" },
      { key: "B", effectiveFrom: d("2026-09-09"), effectiveUntil: d("2026-10-12"), v: "B-vieja" },
      { key: "C", effectiveFrom: d("2026-01-01"), effectiveUntil: null, v: "C1" },
      { key: "B", effectiveFrom: d("2026-10-13"), effectiveUntil: null, v: "B-nueva" },
    ];
    expect(unaVersionPorClave(filas, AHORA).map((f) => f.v)).toEqual(["A1", "C1", "B-nueva"]);
  });
});
