/**
 * Helper puro para calcular el costo de un recurso material/gasto indirecto
 * y la suma agregada de varios recursos (Addendum v8).
 *
 * Fuente: 47_sds_motor_precio_cambios_materiales.md.
 *
 * No tiene I/O. Recibe datos plain y devuelve datos plain.
 */

export type ResourceCategory =
  | "equipo_computo"
  | "mobiliario"
  | "software_licencia"
  | "cloud"
  | "renta"
  | "internet"
  | "energia_agua"
  | "contabilidad_admin"
  | "transporte"
  | "consultoria"
  | "otros";

export type AcquisitionMode =
  | "existing_owned"
  | "used_owned"
  | "new_with_invoice"
  | "new_without_invoice"
  | "rented"
  | "financed"
  | "subscription";

export type InvoiceStatus = "cfdi_valid" | "pending" | "no_invoice" | "not_applicable";

export interface ResourceCostInput {
  category: ResourceCategory | string;
  description: string;
  acquisitionMode: AcquisitionMode | string;
  quantity: number;
  unitCostBeforeVat: number;
  vatRate?: number;             // default 0.16
  vatCreditablePercent?: number; // 0..1; default 1 si cfdi_valid, 0 si no_invoice
  invoiceStatus?: InvoiceStatus | string;
  allocationPercent?: number;   // 0..1; default 1
  monthsAllocated?: number;     // default 1
  cashOutflowMonth?: number;    // mes 1-N; default 1
  capitalizedAsset?: boolean;
  depreciationRateAnnual?: number; // 0..1 anual
  isRecurring?: boolean;
}

export interface ResourceCostBreakdown {
  grossBeforeVat: number;
  allocatedBeforeVat: number;
  vatTransferred: number;
  vatCreditable: number;
  cashOutflowAtPurchase: number;  // sale del bolsillo en el mes de compra
  monthlyAllocatedCost: number;   // contabilidad mensual (depreciación o subscription)
  warnings: string[];
}

const DEFAULT_VAT_RATE = 0.16;

/**
 * Decide el porcentaje de IVA acreditable según el invoiceStatus,
 * a menos que el llamador lo pase explícito.
 */
function deriveVatCreditablePercent(
  invoiceStatus: string | undefined,
  explicit: number | undefined,
): number {
  if (typeof explicit === "number") return Math.max(0, Math.min(1, explicit));
  if (invoiceStatus === "cfdi_valid") return 1;
  if (invoiceStatus === "no_invoice" || invoiceStatus === "not_applicable") return 0;
  return 0; // pending → conservador, no se considera acreditable hasta tener CFDI
}

/**
 * Calcula el breakdown de un recurso.
 *
 * Reglas:
 *  - existing_owned: no genera salida de efectivo.
 *  - new_with_invoice + cfdi_valid: salida de efectivo total el mes de compra + IVA acreditable.
 *  - new_without_invoice: salida total pero sin IVA acreditable + warning.
 *  - subscription/rented: el costo se distribuye en monthsAllocated; cada mes hay salida.
 *  - financed: trata como salida total inicial (la simulación detallada del crédito queda fuera del scope v8).
 */
export function computeResourceCost(input: ResourceCostInput): ResourceCostBreakdown {
  const warnings: string[] = [];
  const vatRate = typeof input.vatRate === "number" ? input.vatRate : DEFAULT_VAT_RATE;
  const allocationPercent = typeof input.allocationPercent === "number" ? input.allocationPercent : 1;
  const monthsAllocated = typeof input.monthsAllocated === "number" && input.monthsAllocated > 0 ? input.monthsAllocated : 1;
  const vatCreditablePercent = deriveVatCreditablePercent(input.invoiceStatus, input.vatCreditablePercent);

  const grossBeforeVat = Math.max(0, input.quantity) * Math.max(0, input.unitCostBeforeVat);
  const allocatedBeforeVat = grossBeforeVat * Math.max(0, Math.min(1, allocationPercent));
  const vatTransferred = allocatedBeforeVat * vatRate;
  const vatCreditable = vatTransferred * vatCreditablePercent;

  let cashOutflowAtPurchase = 0;
  let monthlyAllocatedCost = 0;

  switch (input.acquisitionMode) {
    case "existing_owned":
    case "used_owned":
      cashOutflowAtPurchase = 0; // ya se pagó antes del proyecto
      monthlyAllocatedCost = allocatedBeforeVat / monthsAllocated; // costo de uso interno
      break;
    case "subscription":
    case "rented":
      // Costo recurrente; salida cada mes durante monthsAllocated
      monthlyAllocatedCost = allocatedBeforeVat / monthsAllocated;
      cashOutflowAtPurchase = monthlyAllocatedCost + monthlyAllocatedCost * vatRate; // primer pago en mes 1
      if (input.invoiceStatus !== "cfdi_valid") {
        warnings.push("Suscripción sin CFDI válido; revisa con tu contador antes de acreditar IVA.");
      }
      break;
    case "new_with_invoice":
      cashOutflowAtPurchase = allocatedBeforeVat + vatTransferred;
      if (input.capitalizedAsset && typeof input.depreciationRateAnnual === "number" && input.depreciationRateAnnual > 0) {
        monthlyAllocatedCost = (allocatedBeforeVat * input.depreciationRateAnnual) / 12;
      } else {
        monthlyAllocatedCost = allocatedBeforeVat / monthsAllocated;
      }
      break;
    case "new_without_invoice":
      cashOutflowAtPurchase = allocatedBeforeVat + vatTransferred;
      monthlyAllocatedCost = allocatedBeforeVat / monthsAllocated;
      warnings.push("Compra sin CFDI: no se estima IVA acreditable. Deducibilidad limitada o nula.");
      break;
    case "financed":
      cashOutflowAtPurchase = (allocatedBeforeVat + vatTransferred) * 0.2; // supuesto: 20% enganche
      monthlyAllocatedCost = allocatedBeforeVat / monthsAllocated;
      warnings.push("Compra financiada: el modelo asume 20% de enganche; ajusta si tu plan es distinto.");
      break;
    default:
      cashOutflowAtPurchase = allocatedBeforeVat + vatTransferred;
      monthlyAllocatedCost = allocatedBeforeVat / monthsAllocated;
  }

  if (allocationPercent < 1 && allocationPercent > 0) {
    warnings.push(`Recurso compartido: solo ${(allocationPercent * 100).toFixed(0)}% del costo se imputa a este proyecto.`);
  }
  if (input.invoiceStatus === "pending") {
    warnings.push("Estado de factura pendiente: el IVA acreditable no se considera hasta confirmar CFDI.");
  }

  return {
    grossBeforeVat,
    allocatedBeforeVat,
    vatTransferred,
    vatCreditable,
    cashOutflowAtPurchase,
    monthlyAllocatedCost,
    warnings,
  };
}

export interface ResourceSummary {
  count: number;
  allocatedBeforeVat: number;
  vatTransferred: number;
  vatCreditable: number;
  netVatPayable: number;             // max(0, vatTransferred - vatCreditable)
  cashOutflowMonth1: number;
  totalMonthlyRecurring: number;
  warnings: string[];
}

/**
 * Suma los breakdowns de varios recursos y produce un resumen agregado
 * usado por el motor de cambios y por el cashflow.
 */
export function computeResourceSummary(
  inputs: ResourceCostInput[],
): { breakdowns: ResourceCostBreakdown[]; summary: ResourceSummary } {
  const breakdowns = inputs.map(computeResourceCost);
  const allocatedBeforeVat = breakdowns.reduce((a, b) => a + b.allocatedBeforeVat, 0);
  const vatTransferred = breakdowns.reduce((a, b) => a + b.vatTransferred, 0);
  const vatCreditable = breakdowns.reduce((a, b) => a + b.vatCreditable, 0);
  const cashOutflowMonth1 = inputs.reduce((a, b, i) => {
    const month = b.cashOutflowMonth ?? 1;
    return month === 1 ? a + breakdowns[i].cashOutflowAtPurchase : a;
  }, 0);
  const totalMonthlyRecurring = inputs.reduce((a, b, i) => {
    return b.isRecurring || b.acquisitionMode === "subscription" || b.acquisitionMode === "rented"
      ? a + breakdowns[i].monthlyAllocatedCost
      : a;
  }, 0);
  const netVatPayable = Math.max(0, vatTransferred - vatCreditable);
  const warnings = Array.from(new Set(breakdowns.flatMap((b) => b.warnings)));
  return {
    breakdowns,
    summary: {
      count: inputs.length,
      allocatedBeforeVat,
      vatTransferred,
      vatCreditable,
      netVatPayable,
      cashOutflowMonth1,
      totalMonthlyRecurring,
      warnings,
    },
  };
}
