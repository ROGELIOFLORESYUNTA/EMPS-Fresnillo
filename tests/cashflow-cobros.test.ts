import { describe, it, expect } from "vitest";
import { buildSimpleCashFlow } from "@/lib/engine/cashflow";

function cobros(durationMonths: number) {
  const r = buildSimpleCashFlow({
    totalContractAmount: 100000,
    anticipoPct: 0.3,
    finalPaymentPct: 0.3,
    durationMonths,
    monthlyOutflowPayroll: 10000,
    monthlyOutflowTaxes: 1000,
    monthlyOutflowTools: 500,
    monthlyOutflowAdmin: 500,
  } as Parameters<typeof buildSimpleCashFlow>[0]);
  return r.months.map((m) => m.income);
}

describe("buildSimpleCashFlow: la suma de cobros es el monto del contrato", () => {
  it.each([1, 2, 3, 4, 6, 12])("con %i meses de duracion", (d) => {
    const c = cobros(d);
    expect(c.length).toBe(d);
    expect(c.reduce((a, b) => a + b, 0)).toBeCloseTo(100000, 2);
  });
  it("con 4 meses: 30 % al inicio, 20 % en cada mes intermedio y 30 % al final", () => {
    expect(cobros(4)).toEqual([30000, 20000, 20000, 30000]);
  });
  it("con 2 meses lo restante se cobra con el pago final", () => {
    expect(cobros(2)).toEqual([30000, 70000]);
  });
});
