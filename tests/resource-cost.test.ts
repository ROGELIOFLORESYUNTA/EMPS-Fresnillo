/**
 * Tests del Addendum v8: resource-cost + change-materials.
 * Cubre los 10 casos mínimos de 53_tests_materiales_cambios.md.
 */
import { describe, it, expect } from "vitest";
import { computeResourceCost, computeResourceSummary } from "@/lib/engine/resource-cost";
import { computeChangeWithMaterials } from "@/lib/engine/change-materials";
import { computeChangeImpact } from "@/lib/engine/change-impact";
import type { ChangeImpactInput, AffectedArtifactInput } from "@/lib/engine/change-types";

const emptyArtifacts: AffectedArtifactInput = {
  uiScreens: 0, apiEndpoints: 0, businessRules: 0, databaseTables: 0, reports: 0, rolesPermissions: 0,
  externalIntegrations: 0, dataMigrationObjects: 0, automatedTests: 0, manualTestScenarios: 0, documentsOrTrainingItems: 0,
};

function baseChange(overrides: Partial<ChangeImpactInput> = {}): ChangeImpactInput {
  return {
    projectId: "p1",
    originalText: "Cambio con materiales",
    currentPhase: "after_baseline",
    clarityLevel: 3,
    urgencyLevel: 3,
    developmentMode: "hybrid",
    affectedArtifacts: { ...emptyArtifacts, uiScreens: 1, apiEndpoints: 1, businessRules: 1 },
    securityImpact: 0,
    dataImpact: 0,
    integrationImpact: 0,
    testingRequired: false,
    clientAvailabilityRisk: 0.15,
    ...overrides,
  };
}

describe("computeResourceCost — casos del addendum v8", () => {
  it("1. compra con CFDI calcula IVA acreditable completo", () => {
    const r = computeResourceCost({
      category: "equipo_computo",
      description: "Laptop nueva",
      acquisitionMode: "new_with_invoice",
      quantity: 1,
      unitCostBeforeVat: 25000,
      invoiceStatus: "cfdi_valid",
    });
    expect(r.grossBeforeVat).toBe(25000);
    expect(r.vatTransferred).toBeCloseTo(4000, 1); // 25000 × 0.16
    expect(r.vatCreditable).toBeCloseTo(4000, 1);
    expect(r.cashOutflowAtPurchase).toBeCloseTo(29000, 1);
    expect(r.warnings).toEqual([]);
  });

  it("2. compra sin CFDI deja IVA acreditable en 0 y genera advertencia", () => {
    const r = computeResourceCost({
      category: "equipo_computo",
      description: "Laptop sin factura",
      acquisitionMode: "new_without_invoice",
      quantity: 1,
      unitCostBeforeVat: 25000,
      invoiceStatus: "no_invoice",
    });
    expect(r.vatCreditable).toBe(0);
    expect(r.warnings.length).toBeGreaterThan(0);
    expect(r.warnings.some((w) => w.toLowerCase().includes("cfdi"))).toBe(true);
  });

  it("3. suscripción distribuye costo por meses", () => {
    const r = computeResourceCost({
      category: "software_licencia",
      description: "Suscripción 6 meses",
      acquisitionMode: "subscription",
      quantity: 1,
      unitCostBeforeVat: 6000,
      monthsAllocated: 6,
      invoiceStatus: "cfdi_valid",
    });
    expect(r.monthlyAllocatedCost).toBeCloseTo(1000, 1);
    // cashOutflowAtPurchase = 1 mes + IVA del mes
    expect(r.cashOutflowAtPurchase).toBeCloseTo(1000 + 160, 1);
  });

  it("4. recurso existente no genera salida de efectivo", () => {
    const r = computeResourceCost({
      category: "equipo_computo",
      description: "Laptop ya comprada hace 1 año",
      acquisitionMode: "existing_owned",
      quantity: 1,
      unitCostBeforeVat: 20000,
    });
    expect(r.cashOutflowAtPurchase).toBe(0);
    expect(r.monthlyAllocatedCost).toBeGreaterThan(0); // costo de uso interno
  });

  it("5. computadora nueva usa depreciación 30% anual cuando se marca como activo capitalizable", () => {
    const r = computeResourceCost({
      category: "equipo_computo",
      description: "Servidor capitalizable",
      acquisitionMode: "new_with_invoice",
      quantity: 1,
      unitCostBeforeVat: 60000,
      monthsAllocated: 12,
      invoiceStatus: "cfdi_valid",
      capitalizedAsset: true,
      depreciationRateAnnual: 0.30,
    });
    // 60000 * 0.30 / 12 = 1500
    expect(r.monthlyAllocatedCost).toBeCloseTo(1500, 1);
  });

  it("6. mobiliario usa depreciación 10% anual", () => {
    const r = computeResourceCost({
      category: "mobiliario",
      description: "Escritorios y sillas",
      acquisitionMode: "new_with_invoice",
      quantity: 4,
      unitCostBeforeVat: 5000,
      monthsAllocated: 12,
      invoiceStatus: "cfdi_valid",
      capitalizedAsset: true,
      depreciationRateAnnual: 0.10,
    });
    // gross = 20000; 20000 * 0.10 / 12 ≈ 166.67
    expect(r.monthlyAllocatedCost).toBeCloseTo(166.67, 1);
  });

  it("9. recurso compartido al 50% solo asigna la mitad al proyecto", () => {
    const r = computeResourceCost({
      category: "internet",
      description: "Internet compartido con otra área",
      acquisitionMode: "subscription",
      quantity: 1,
      unitCostBeforeVat: 2000,
      monthsAllocated: 1,
      allocationPercent: 0.5,
      invoiceStatus: "cfdi_valid",
    });
    expect(r.allocatedBeforeVat).toBe(1000);
    expect(r.vatTransferred).toBeCloseTo(160, 1);
    expect(r.warnings.some((w) => w.includes("50%"))).toBe(true);
  });

  it("10. invoice pending → IVA acreditable 0 con advertencia", () => {
    const r = computeResourceCost({
      category: "consultoria",
      description: "Consultoría externa",
      acquisitionMode: "new_with_invoice",
      quantity: 1,
      unitCostBeforeVat: 10000,
      invoiceStatus: "pending",
    });
    expect(r.vatCreditable).toBe(0);
    expect(r.warnings.some((w) => w.toLowerCase().includes("pendiente"))).toBe(true);
  });
});

describe("computeResourceSummary", () => {
  it("agrega múltiples recursos correctamente", () => {
    const { summary } = computeResourceSummary([
      { category: "software_licencia", description: "Lic", acquisitionMode: "subscription", quantity: 1, unitCostBeforeVat: 1800, monthsAllocated: 2, invoiceStatus: "cfdi_valid", isRecurring: true },
      { category: "cloud", description: "Cloud", acquisitionMode: "subscription", quantity: 1, unitCostBeforeVat: 2500, monthsAllocated: 1, invoiceStatus: "cfdi_valid", isRecurring: true },
    ]);
    expect(summary.count).toBe(2);
    expect(summary.allocatedBeforeVat).toBe(1800 + 2500);
    expect(summary.vatTransferred).toBeCloseTo((1800 + 2500) * 0.16, 1);
    expect(summary.vatCreditable).toBeCloseTo((1800 + 2500) * 0.16, 1);
    expect(summary.netVatPayable).toBe(0); // todo acreditable
    expect(summary.totalMonthlyRecurring).toBeGreaterThan(0);
  });
});

describe("computeChangeWithMaterials — integración v7 + v8", () => {
  it("7. cambio con materiales aumenta el total a facturar vs sin materiales", () => {
    const changeImpact = computeChangeImpact(baseChange());
    const withoutMaterials = computeChangeWithMaterials({ changeImpact, resources: [] });
    const withMaterials = computeChangeWithMaterials({
      changeImpact,
      resources: [
        { category: "cloud", description: "Servidor temporal", acquisitionMode: "subscription", quantity: 1, unitCostBeforeVat: 5000, monthsAllocated: 1, invoiceStatus: "cfdi_valid" },
      ],
    });
    expect(withMaterials.totalInvoice).toBeGreaterThan(withoutMaterials.totalInvoice);
    expect(withMaterials.resourceSummary.count).toBe(1);
  });

  it("8. cambio con compra en mes 1 aumenta bache de caja (cashflowImpactMonth1 > 0)", () => {
    const changeImpact = computeChangeImpact(baseChange());
    const result = computeChangeWithMaterials({
      changeImpact,
      resources: [
        { category: "equipo_computo", description: "Laptop urgente", acquisitionMode: "new_with_invoice", quantity: 1, unitCostBeforeVat: 30000, invoiceStatus: "cfdi_valid", cashOutflowMonth: 1 },
      ],
    });
    expect(result.cashflowImpactMonth1).toBeGreaterThan(0);
    expect(result.fiscalWarnings.some((w) => w.toLowerCase().includes("bache"))).toBe(true);
  });

  it("explicación dual: cliente sin jerga vs proveedor con números", () => {
    const changeImpact = computeChangeImpact(baseChange());
    const result = computeChangeWithMaterials({
      changeImpact,
      resources: [
        { category: "software_licencia", description: "Licencia", acquisitionMode: "new_with_invoice", quantity: 1, unitCostBeforeVat: 5000, invoiceStatus: "cfdi_valid" },
      ],
    });
    expect(result.explanationForClient.length).toBeGreaterThan(0);
    expect(result.explanationForProvider.length).toBeGreaterThan(0);
    const clientText = result.explanationForClient.join(" ").toLowerCase();
    // Cliente NO debe ver "vatTransferred" ni "subtotalBeforeVat" como jerga
    expect(clientText).not.toContain("subtotalbeforevat");
    expect(clientText).not.toContain("vattransferred");
    // Proveedor SÍ debe ver desglose numérico
    expect(result.explanationForProvider.join(" ")).toMatch(/IVA|Subtotal/i);
  });

  it("internalCostBeforeVat es distinto de totalInvoice (sin confundir costo interno con precio al cliente)", () => {
    const changeImpact = computeChangeImpact(baseChange());
    const result = computeChangeWithMaterials({
      changeImpact,
      resources: [
        { category: "software_licencia", description: "Licencia", acquisitionMode: "new_with_invoice", quantity: 1, unitCostBeforeVat: 5000, invoiceStatus: "cfdi_valid" },
      ],
    });
    expect(result.internalCostBeforeVat).toBeLessThan(result.totalInvoice);
    expect(result.subtotalBeforeVat).toBeLessThan(result.totalInvoice);
  });
});
