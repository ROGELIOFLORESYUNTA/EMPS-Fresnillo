/**
 * Integra el motor de cambios v7 con los recursos materiales v8.
 * Devuelve precio interno vs precio al cliente vs total a facturar
 * con desglose claro (Addendum v8).
 *
 * NO reemplaza change-impact.ts. Lo recibe ya calculado y agrega
 * la capa de materiales/IVA.
 *
 * Fuente: 47_sds_motor_precio_cambios_materiales.md.
 */
import type { ChangeImpactResult, ChangeFinancialBreakdown } from "./change-types";
import {
  computeResourceSummary,
  type ResourceCostInput,
  type ResourceSummary,
} from "./resource-cost";

const DEFAULT_IVA = 0.16;
const DEFAULT_ADMIN_OVERHEAD_RATE = 0.10;

export interface ChangeWithMaterialsInput {
  /** Resultado del motor v7 (computeChangeImpact). */
  changeImpact: ChangeImpactResult;
  /** Recursos materiales asociados al cambio. */
  resources: ResourceCostInput[];
  /** Tasa de IVA general (default 0.16). */
  ivaRate?: number;
  /** Overhead administrativo (default 0.10 sobre labor). */
  adminOverheadRate?: number;
}

export interface ChangeMaterialsBreakdown {
  // Mano de obra y carga fiscal (vienen del motor v7)
  changeLabor: number;
  fiscalLabor: number;       // IMSS + ISN + LFT prorrateado del v7
  adminOverhead: number;
  contingencyAmount: number;

  // Recursos materiales agregados
  resourceSummary: ResourceSummary;

  // Totales v8
  subtotalBeforeVat: number;          // labor + fiscal + admin + contingencia + materiales
  vatTransferredV8: number;           // IVA sobre subtotalBeforeVat
  vatCreditableEstimated: number;     // IVA acreditable de recursos
  netVatEstimate: number;             // max(0, vatTransferred - vatCreditable)
  totalInvoice: number;               // subtotal + IVA trasladado
  cashflowImpactMonth1: number;       // salida de efectivo del mes 1

  // Diferencias clave para explicabilidad
  internalCostBeforeVat: number;      // costo para el proveedor (sin margen de cliente)
  materialWarnings: string[];
  fiscalWarnings: string[];

  explanationForClient: string[];
  explanationForProvider: string[];
}

/**
 * Combina el resultado de computeChangeImpact con los recursos materiales
 * para producir el desglose v8 completo.
 */
export function computeChangeWithMaterials(
  input: ChangeWithMaterialsInput,
): ChangeMaterialsBreakdown {
  const { changeImpact, resources } = input;
  const ivaRate = typeof input.ivaRate === "number" ? input.ivaRate : DEFAULT_IVA;
  const adminOverheadRate = typeof input.adminOverheadRate === "number" ? input.adminOverheadRate : DEFAULT_ADMIN_OVERHEAD_RATE;

  // Datos del motor v7
  const baseFinancial: ChangeFinancialBreakdown | undefined = changeImpact.financialBreakdown;
  const changeLabor = baseFinancial?.laborCost ?? changeImpact.costImpact ?? 0;
  const fiscalLabor = (baseFinancial?.imssEstimated ?? 0) + (baseFinancial?.isnEstimated ?? 0);
  const adminOverheadFromV7 = baseFinancial?.adminOverhead ?? changeLabor * adminOverheadRate;
  const contingencyAmount = baseFinancial?.contingencyAmount ?? 0;

  // Materiales v8
  const { summary: resourceSummary } = computeResourceSummary(resources);

  // Subtotal antes de IVA v8
  const subtotalBeforeVat =
    changeLabor +
    fiscalLabor +
    adminOverheadFromV7 +
    contingencyAmount +
    resourceSummary.allocatedBeforeVat;

  const vatTransferredV8 = subtotalBeforeVat * ivaRate;
  const vatCreditableEstimated = resourceSummary.vatCreditable;
  const netVatEstimate = Math.max(0, vatTransferredV8 - vatCreditableEstimated);
  const totalInvoice = subtotalBeforeVat + vatTransferredV8;

  // Impacto en bache de caja del mes 1
  const cashflowImpactMonth1 = resourceSummary.cashOutflowMonth1;

  // Costo interno (sin margen del cliente, sin IVA): lo que el proveedor "gasta" del bolsillo
  const internalCostBeforeVat =
    changeLabor + fiscalLabor + adminOverheadFromV7 + resourceSummary.allocatedBeforeVat;

  // === Warnings ===
  const materialWarnings = [...resourceSummary.warnings];
  const fiscalWarnings: string[] = [];
  if (changeImpact.freeChangeGuardrailReason) {
    fiscalWarnings.push(changeImpact.freeChangeGuardrailReason);
  }
  if (changeImpact.minimumChargeApplied) {
    fiscalWarnings.push("Se aplicó el costo mínimo configurado (CHANGE_MINIMUM_CHARGE_MXN).");
  }
  if (cashflowImpactMonth1 > 0 && resources.some((r) => r.cashOutflowMonth === 1)) {
    fiscalWarnings.push("Compras en el mes 1 aumentan el bache de caja del proyecto.");
  }

  // === Explicación para Ayuntamiento (lenguaje claro) ===
  const explanationForClient: string[] = [];
  if (resources.length > 0) {
    explanationForClient.push(
      `Este cambio requiere ${resources.length} recurso(s) adicional(es) (licencias, equipo, servicios). El costo de esos recursos se suma a la mano de obra.`,
    );
  }
  if (resourceSummary.totalMonthlyRecurring > 0) {
    explanationForClient.push(
      `Hay gastos recurrentes mensuales por ~$${resourceSummary.totalMonthlyRecurring.toLocaleString("es-MX", { maximumFractionDigits: 0 })} (suscripciones, renta). Esto sigue costando aunque el cambio ya esté entregado.`,
    );
  }
  if (vatCreditableEstimated > 0) {
    explanationForClient.push(
      `Parte del IVA pagado en compras se acredita ($${vatCreditableEstimated.toLocaleString("es-MX", { maximumFractionDigits: 0 })}), así que el IVA neto al SAT es menor que el total trasladado.`,
    );
  } else if (resources.length > 0 && vatTransferredV8 > 0) {
    explanationForClient.push(
      `Los recursos comprados NO generan IVA acreditable (probablemente sin CFDI), así que el proveedor paga el IVA completo al SAT sin compensación.`,
    );
  }
  if (changeImpact.plainExplanationForClient) {
    explanationForClient.push(...changeImpact.plainExplanationForClient);
  }

  // === Explicación para proveedor/investigador (técnica) ===
  const explanationForProvider: string[] = [];
  explanationForProvider.push(
    `Labor: $${changeLabor.toLocaleString("es-MX", { maximumFractionDigits: 0 })} (${changeImpact.probableHours.toFixed(1)}h × $${(changeImpact.hourlyRateUsed ?? 0).toLocaleString("es-MX", { maximumFractionDigits: 0 })}/h).`,
  );
  explanationForProvider.push(
    `Fiscal-laboral: IMSS+ISN = $${fiscalLabor.toLocaleString("es-MX", { maximumFractionDigits: 0 })}. Admin overhead: $${adminOverheadFromV7.toLocaleString("es-MX", { maximumFractionDigits: 0 })}. Contingencia: $${contingencyAmount.toLocaleString("es-MX", { maximumFractionDigits: 0 })}.`,
  );
  explanationForProvider.push(
    `Recursos (${resources.length}): $${resourceSummary.allocatedBeforeVat.toLocaleString("es-MX", { maximumFractionDigits: 0 })} antes de IVA. IVA trasladado: $${resourceSummary.vatTransferred.toLocaleString("es-MX", { maximumFractionDigits: 0 })}. IVA acreditable estimado: $${resourceSummary.vatCreditable.toLocaleString("es-MX", { maximumFractionDigits: 0 })}.`,
  );
  explanationForProvider.push(
    `Subtotal antes de IVA: $${subtotalBeforeVat.toLocaleString("es-MX", { maximumFractionDigits: 0 })}. IVA ${(ivaRate * 100).toFixed(0)}%: $${vatTransferredV8.toLocaleString("es-MX", { maximumFractionDigits: 0 })}. IVA neto al SAT: $${netVatEstimate.toLocaleString("es-MX", { maximumFractionDigits: 0 })}.`,
  );
  explanationForProvider.push(
    `Total a facturar al cliente: $${totalInvoice.toLocaleString("es-MX", { maximumFractionDigits: 0 })}. Costo interno (sin margen extra): $${internalCostBeforeVat.toLocaleString("es-MX", { maximumFractionDigits: 0 })}.`,
  );
  if (cashflowImpactMonth1 > 0) {
    explanationForProvider.push(
      `Impacto en bache: el proveedor sale $${cashflowImpactMonth1.toLocaleString("es-MX", { maximumFractionDigits: 0 })} del bolsillo en el mes 1 por compras inmediatas.`,
    );
  }
  if (changeImpact.technicalExplanationForProvider) {
    explanationForProvider.push(...changeImpact.technicalExplanationForProvider);
  }

  return {
    changeLabor,
    fiscalLabor,
    adminOverhead: adminOverheadFromV7,
    contingencyAmount,
    resourceSummary,
    subtotalBeforeVat,
    vatTransferredV8,
    vatCreditableEstimated,
    netVatEstimate,
    totalInvoice,
    cashflowImpactMonth1,
    internalCostBeforeVat,
    materialWarnings,
    fiscalWarnings,
    explanationForClient,
    explanationForProvider,
  };
}
