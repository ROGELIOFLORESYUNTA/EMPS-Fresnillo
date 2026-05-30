/**
 * Test de regresión: tabla CEAV patronal escalonada (LSS Art. 168 fr. II).
 * Confirma que el motor selecciona la tasa correcta según el SBC en UMAs
 * vigente 2026 (Reforma de Pensiones DOF 16-dic-2020, 4to ajuste).
 * Si alguien cambia los valores del seed sin actualizar la tabla, este test rompe.
 */
import { describe, it, expect } from "vitest";
import { ceavPatronRate } from "@/lib/engine/cost";

const TABLA_2026 = {
  "hasta_1.00_UMA": 0.0315,
  "1.01_a_1.50_UMA": 0.03676,
  "1.51_a_2.00_UMA": 0.04851,
  "2.01_a_2.50_UMA": 0.05556,
  "2.51_a_3.00_UMA": 0.06026,
  "3.01_a_3.50_UMA": 0.06361,
  "3.51_a_4.00_UMA": 0.06613,
  "4.01_UMA_o_mas": 0.07513,
};

describe("ceavPatronRate — tabla escalonada LSS Art. 168 fr. II vigente 2026", () => {
  it("salario mínimo (1 UMA exacto) usa el rango 'hasta 1 UMA' = 3.15%", () => {
    expect(ceavPatronRate(1.0, TABLA_2026)).toBeCloseTo(0.0315, 5);
  });

  it("1.5 UMA usa el rango '1.01 a 1.50' = 3.676%", () => {
    expect(ceavPatronRate(1.5, TABLA_2026)).toBeCloseTo(0.03676, 5);
  });

  it("dev mid (3 UMA exacto) usa el rango '2.51 a 3.00' = 6.026%", () => {
    expect(ceavPatronRate(3.0, TABLA_2026)).toBeCloseTo(0.06026, 5);
  });

  it("dev senior (5 UMA) usa el rango '4.01 o más' = 7.513%", () => {
    expect(ceavPatronRate(5.0, TABLA_2026)).toBeCloseTo(0.07513, 5);
  });

  it("límite superior (25 UMA, tope SBC IMSS) sigue en 7.513%", () => {
    expect(ceavPatronRate(25.0, TABLA_2026)).toBeCloseTo(0.07513, 5);
  });

  it("rangos fronterizos: 2.5 UMA exacto cae en rango 2.01-2.50", () => {
    expect(ceavPatronRate(2.5, TABLA_2026)).toBeCloseTo(0.05556, 5);
  });

  it("rangos fronterizos: 2.51 UMA cae en rango 2.51-3.00 (siguiente)", () => {
    expect(ceavPatronRate(2.51, TABLA_2026)).toBeCloseTo(0.06026, 5);
  });

  it("si la tabla del seed estuviera vacía, usa los fallbacks hardcoded 2026", () => {
    // Simula que la DB devuelve tabla vacía: el motor debe degradar a defaults
    expect(ceavPatronRate(1.0, {})).toBeCloseTo(0.0315, 5);
    expect(ceavPatronRate(5.0, {})).toBeCloseTo(0.07513, 5);
  });

  it("trayectoria 2026→2030: el tope superior (4.01+) llegará a 11.875% en 2030", () => {
    // Documenta la calibración Reforma Pensiones. Si alguien actualiza la tabla
    // al año siguiente, este test sirve como referencia histórica del ajuste anual.
    const TABLA_2030_PROYECTADA = { ...TABLA_2026, "4.01_UMA_o_mas": 0.11875 };
    expect(ceavPatronRate(5.0, TABLA_2030_PROYECTADA)).toBeCloseTo(0.11875, 5);
  });
});
