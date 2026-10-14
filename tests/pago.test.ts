/**
 * Pago por día o por mes, y el aviso de salario mínimo.
 * El motor lee siempre el sueldo mensual; el pago por día se pasa a mensual con 30.4.
 */
import { describe, it, expect } from "vitest";
import {
  FACTOR_DIAS_MES,
  SALARIO_MINIMO_DIARIO_POR_OMISION,
  salarioMensualDesde,
  salarioDiarioDesde,
  avisoSalarioMinimo,
  conMensualDelPagoDiario,
  redondear2,
} from "@/lib/engine/pago";

describe("salarioMensualDesde: de pago por día a sueldo mensual", () => {
  it("600 pesos al día son 18,240 al mes (600 x 30.4)", () => {
    expect(FACTOR_DIAS_MES).toBe(30.4);
    expect(salarioMensualDesde({ payBasis: "diario", monthlySalary: 0, dailyRate: 600 })).toBe(18240);
  });

  it("el pago mensual pasa tal cual, aunque haya un pago por día guardado", () => {
    expect(salarioMensualDesde({ payBasis: "mensual", monthlySalary: 25000, dailyRate: 999 })).toBe(25000);
    expect(salarioMensualDesde({ payBasis: null, monthlySalary: 25000 })).toBe(25000);
    expect(salarioMensualDesde({ monthlySalary: 25000 })).toBe(25000);
  });

  it("si dice diario pero no trae el pago por día, usa el mensual en vez de devolver cero", () => {
    expect(salarioMensualDesde({ payBasis: "diario", monthlySalary: 18000, dailyRate: null })).toBe(18000);
  });

  it("sin ningún dato no inventa nada", () => {
    expect(salarioMensualDesde({})).toBe(0);
    expect(salarioMensualDesde({ monthlySalary: Number.NaN })).toBe(0);
  });

  it("de mensual a diario es la operación contraria (mensual / 30.4)", () => {
    expect(salarioDiarioDesde(18240)).toBe(600);
    expect(salarioDiarioDesde(30000)).toBeCloseTo(986.8421, 4);
    expect(salarioDiarioDesde(Number.NaN)).toBe(0);
  });
});

describe("avisoSalarioMinimo", () => {
  it("300 al día (9,120 al mes) queda abajo del mínimo y lo dice con las cifras del mínimo", () => {
    const mensual = salarioMensualDesde({ payBasis: "diario", dailyRate: 300 });
    expect(mensual).toBe(9120);
    expect(avisoSalarioMinimo(mensual, 315.04)).toBe(
      "Queda abajo del salario mínimo general (315.04 diarios, 9,577.22 al mes).",
    );
  });

  it("600 al día no avisa nada", () => {
    expect(avisoSalarioMinimo(18240, 315.04)).toBeNull();
  });

  it("justo en el mínimo (el diario por 30.4, o el mensual publicado de 9,577.22) no es 'abajo'", () => {
    expect(avisoSalarioMinimo(315.04 * 30.4, 315.04)).toBeNull();
    expect(avisoSalarioMinimo(9577.22, 315.04)).toBeNull();
    expect(avisoSalarioMinimo(9577.21, 315.04)).not.toBeNull();
  });

  it("cero pesos también queda abajo", () => {
    expect(avisoSalarioMinimo(0, SALARIO_MINIMO_DIARIO_POR_OMISION)).toContain("Queda abajo del salario mínimo general");
  });

  it("sin dato del mínimo o con cifras raras no avisa (no hay contra qué comparar)", () => {
    expect(avisoSalarioMinimo(5000, 0)).toBeNull();
    expect(avisoSalarioMinimo(5000, Number.NaN)).toBeNull();
    expect(avisoSalarioMinimo(Number.NaN, 315.04)).toBeNull();
  });

  it("usa el mínimo que se le pasa, no uno fijo", () => {
    // Con un mínimo de 300 al día el mensual es 9,120.00
    expect(avisoSalarioMinimo(9000, 300)).toBe("Queda abajo del salario mínimo general (300.00 diarios, 9,120.00 al mes).");
    expect(avisoSalarioMinimo(9120, 300)).toBeNull();
  });
});

describe("conMensualDelPagoDiario: lo que hace el servidor antes de validar", () => {
  it("con pago por día le pone el sueldo mensual a centavos (350.50 x 30.4 = 10,655.20)", () => {
    const c = conMensualDelPagoDiario({ name: "Ana", payBasis: "diario", dailyRate: 350.5 }) as Record<string, unknown>;
    expect(c.monthlySalary).toBe(10655.2);
    expect(c.name).toBe("Ana");
  });

  it("el pago por día manda sobre un mensual que llegue desactualizado", () => {
    const c = conMensualDelPagoDiario({ payBasis: "diario", dailyRate: 600, monthlySalary: 1 }) as Record<string, unknown>;
    expect(c.monthlySalary).toBe(18240);
  });

  it("sin pago por día devuelve el cuerpo igual", () => {
    const mensual = { payBasis: "mensual", dailyRate: 600, monthlySalary: 25000 };
    expect(conMensualDelPagoDiario(mensual)).toBe(mensual);
    const sinTasa = { payBasis: "diario", monthlySalary: 25000 };
    expect(conMensualDelPagoDiario(sinTasa)).toBe(sinTasa);
    const tasaCero = { payBasis: "diario", dailyRate: 0, monthlySalary: 25000 };
    expect(conMensualDelPagoDiario(tasaCero)).toBe(tasaCero);
  });

  it("no se rompe con cuerpos que no son objetos", () => {
    expect(conMensualDelPagoDiario(null)).toBeNull();
    expect(conMensualDelPagoDiario("hola")).toBe("hola");
    expect(conMensualDelPagoDiario(undefined)).toBeUndefined();
  });

  it("redondear2 deja los pesos a centavos", () => {
    expect(redondear2(10655.199999999999)).toBe(10655.2);
    expect(redondear2(9577.216)).toBe(9577.22);
  });
});
