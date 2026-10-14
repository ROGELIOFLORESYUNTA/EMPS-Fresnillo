/**
 * Flujo de efectivo (07_motor_formulas.md §7).
 * accumulated[n] = accumulated[n-1] + (income[n] - sum(outflows[n]))
 * working_capital_required = abs(min(accumulated[1..N], 0))
 */
import type { CashFlowMonth, CashFlowResult } from "./types";

export interface CashFlowInputMonth {
  monthNumber: number;
  income: number;
  payrollOutflow: number;
  taxOutflow: number;
  toolsOutflow: number;
  adminOutflow: number;
}

export function computeCashFlow(months: CashFlowInputMonth[]): CashFlowResult {
  if (months.length === 0) {
    return { months: [], workingCapitalRequired: 0 };
  }
  const sorted = [...months].sort((a, b) => a.monthNumber - b.monthNumber);
  let acc = 0;
  const out: CashFlowMonth[] = sorted.map((m) => {
    const outflows = m.payrollOutflow + m.taxOutflow + m.toolsOutflow + m.adminOutflow;
    const net = m.income - outflows;
    acc += net;
    return {
      monthNumber: m.monthNumber,
      income: m.income,
      payrollOutflow: m.payrollOutflow,
      taxOutflow: m.taxOutflow,
      toolsOutflow: m.toolsOutflow,
      adminOutflow: m.adminOutflow,
      netFlow: net,
      accumulatedFlow: acc,
    };
  });

  const minAcc = Math.min(0, ...out.map((m) => m.accumulatedFlow));
  return {
    months: out,
    workingCapitalRequired: Math.abs(minAcc),
  };
}

/**
 * Genera un flujo de efectivo a partir de hipotesis simples para el wizard:
 * - Anticipo
 * - Pagos por entregable (proporcional a meses)
 * - Pago final
 * - Egresos mensuales constantes (la nomina y sus impuestos pueden ir mes a mes)
 */
export interface SimpleCashFlowInput {
  totalContractAmount: number;
  anticipoPct: number;        // 0..1
  finalPaymentPct: number;    // 0..1 (resto se distribuye en pagos por entregable)
  /**
   * Un numero es el mismo egreso cada mes. Un arreglo trae el de cada mes (el
   * mes 1 en la posicion 0), por ejemplo nominaPorMes cuando hay personas que
   * participan solo parte del proyecto. Un mes sin dato en el arreglo vale 0.
   */
  monthlyOutflowPayroll: number | number[];
  /** Igual que la nomina: los impuestos de la nomina siguen a la nomina mes a mes. */
  monthlyOutflowTaxes: number | number[];
  monthlyOutflowTools: number;
  monthlyOutflowAdmin: number;
  durationMonths: number;
}

/** Egreso del mes m (1, 2, ...): el numero fijo, o el que toca en el arreglo. */
function delMes(egreso: number | number[], m: number): number {
  return Array.isArray(egreso) ? (egreso[m - 1] ?? 0) : egreso;
}

export function buildSimpleCashFlow(input: SimpleCashFlowInput): CashFlowResult {
  const remaining = 1 - input.anticipoPct - input.finalPaymentPct;
  if (remaining < 0) throw new Error("anticipoPct + finalPaymentPct no puede exceder 1.0");
  const intermediateMonths = Math.max(1, input.durationMonths - 1);
  const intermediatePerMonth = (input.totalContractAmount * remaining) / intermediateMonths;

  const months: CashFlowInputMonth[] = [];
  for (let m = 1; m <= input.durationMonths; m++) {
    let income = 0;
    if (m === 1) income += input.totalContractAmount * input.anticipoPct;
    if (m > 1 && m < input.durationMonths) income += intermediatePerMonth;
    if (m === input.durationMonths) income += input.totalContractAmount * input.finalPaymentPct;

    months.push({
      monthNumber: m,
      income,
      payrollOutflow: delMes(input.monthlyOutflowPayroll, m),
      taxOutflow: delMes(input.monthlyOutflowTaxes, m),
      toolsOutflow: input.monthlyOutflowTools,
      adminOutflow: input.monthlyOutflowAdmin,
    });
  }
  return computeCashFlow(months);
}
