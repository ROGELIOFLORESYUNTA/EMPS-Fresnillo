/**
 * Regla del 20 por ciento (lib/cambios-acumulados.ts): cuando los cambios
 * aceptados suman más del 20 % del precio pactado, ya es otro desarrollo.
 */
import { describe, it, expect } from "vitest";
import {
  AVISO_VEINTE_POR_CIENTO,
  LIMITE_DE_CAMBIOS,
  acumuladoDeCambios,
  esCambioAceptado,
  montoDeCambio,
} from "@/lib/cambios-acumulados";

const PRECIO = 100000;

describe("qué cambios cuentan", () => {
  it("cuentan los aceptados y los incluidos; no los pendientes, rechazados, diferidos ni por aclarar", () => {
    expect(esCambioAceptado("aceptado")).toBe(true);
    expect(esCambioAceptado("incluido")).toBe(true);
    for (const d of ["pendiente", "rechazado", "diferido", "requires_clarification", "", null, undefined]) {
      expect(esCambioAceptado(d), String(d)).toBe(false);
    }
  });
});

describe("cuánto vale un cambio", () => {
  it("manda el subtotal de la evaluación de impacto, luego el costo capturado a mano, luego la mano de obra evaluada", () => {
    expect(montoDeCambio({ subtotalEvaluado: 9000, costImpact: 5000, costoEvaluado: 3000 })).toBe(9000);
    expect(montoDeCambio({ subtotalEvaluado: null, costImpact: 5000, costoEvaluado: 3000 })).toBe(5000);
    expect(montoDeCambio({ costoEvaluado: 3000 })).toBe(3000);
  });

  it("lo que no es un número mayor que cero cuenta como sin dato", () => {
    expect(montoDeCambio({})).toBe(0);
    expect(montoDeCambio({ subtotalEvaluado: 0, costImpact: -10, costoEvaluado: Number.NaN })).toBe(0);
    expect(montoDeCambio({ subtotalEvaluado: 0, costImpact: 700 })).toBe(700);
  });
});

describe("lo acumulado contra el precio pactado", () => {
  it("sin cambios es 0 % y no avisa", () => {
    const r = acumuladoDeCambios([], PRECIO);
    expect(r).toMatchObject({ aceptados: 0, monto: 0, porcentaje: 0, excede: false, precioPactado: PRECIO, limitePct: 20 });
  });

  it("suma solo los aceptados", () => {
    const r = acumuladoDeCambios(
      [
        { decision: "aceptado", monto: 5000 },
        { decision: "incluido", monto: 3000 },
        { decision: "pendiente", monto: 40000 },
        { decision: "rechazado", monto: 40000 },
        { decision: "diferido", monto: 40000 },
      ],
      PRECIO,
    );
    expect(r.aceptados).toBe(2);
    expect(r.monto).toBe(8000);
    expect(r.porcentaje).toBe(8);
    expect(r.excede).toBe(false);
  });

  it("19.9 % todavía no avisa", () => {
    const r = acumuladoDeCambios([{ decision: "aceptado", monto: 19900 }], PRECIO);
    expect(r.porcentaje).toBe(19.9);
    expect(r.excede).toBe(false);
  });

  it("justo 20 % no es pasar: avisa a partir de que lo supera", () => {
    expect(acumuladoDeCambios([{ decision: "aceptado", monto: 20000 }], PRECIO).excede).toBe(false);
    const un = acumuladoDeCambios([{ decision: "aceptado", monto: 20001 }], PRECIO);
    expect(un.excede).toBe(true);
    expect(un.porcentaje).toBe(20);
  });

  it("20.1 % avisa", () => {
    const r = acumuladoDeCambios([{ decision: "aceptado", monto: 20100 }], PRECIO);
    expect(r.porcentaje).toBe(20.1);
    expect(r.excede).toBe(true);
  });

  it("varios cambios chicos que juntos pasan del tope también avisan", () => {
    const cambios = Array.from({ length: 7 }, () => ({ decision: "aceptado", monto: 3000 }));
    const r = acumuladoDeCambios(cambios, PRECIO);
    expect(r.monto).toBe(21000);
    expect(r.excede).toBe(true);
  });

  it("el ruido de los decimales no marca como pasado un 20 % exacto", () => {
    const r = acumuladoDeCambios(
      [
        { decision: "aceptado", monto: 0.1 * 100000 },
        { decision: "aceptado", monto: 0.1 * 100000 },
      ],
      PRECIO,
    );
    expect(r.porcentaje).toBe(20);
    expect(r.excede).toBe(false);
  });

  it("sin precio pactado no hay contra qué comparar: 0 % y sin aviso", () => {
    for (const precio of [0, -5, Number.NaN]) {
      const r = acumuladoDeCambios([{ decision: "aceptado", monto: 999999 }], precio);
      expect(r.porcentaje, String(precio)).toBe(0);
      expect(r.excede, String(precio)).toBe(false);
      expect(r.precioPactado, String(precio)).toBe(0);
    }
  });

  it("un cambio sin monto o con monto raro vale cero pero cuenta como aceptado", () => {
    const r = acumuladoDeCambios(
      [
        { decision: "aceptado", monto: null },
        { decision: "incluido", monto: Number.NaN },
      ],
      PRECIO,
    );
    expect(r.aceptados).toBe(2);
    expect(r.monto).toBe(0);
  });

  it("el tope es el 20 % y la línea de aviso dice lo que se pidió", () => {
    expect(LIMITE_DE_CAMBIOS).toBe(0.2);
    expect(AVISO_VEINTE_POR_CIENTO).toBe(
      "Los cambios ya suman más del 20 % del precio pactado: esto es otro desarrollo, cotízalo aparte",
    );
  });
});
