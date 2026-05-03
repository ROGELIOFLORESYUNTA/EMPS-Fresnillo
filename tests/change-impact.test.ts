/**
 * Tests del motor de control de cambios (Addendum v6).
 * Cubre los 5 casos mínimos de 32_tests_control_cambios.md.
 */
import { describe, it, expect } from "vitest";
import { computeChangeImpact } from "@/lib/engine/change-impact";
import type { ChangeImpactInput, AffectedArtifactInput } from "@/lib/engine/change-types";

const emptyArtifacts: AffectedArtifactInput = {
  uiScreens: 0,
  apiEndpoints: 0,
  businessRules: 0,
  databaseTables: 0,
  reports: 0,
  rolesPermissions: 0,
  externalIntegrations: 0,
  dataMigrationObjects: 0,
  automatedTests: 0,
  manualTestScenarios: 0,
  documentsOrTrainingItems: 0,
};

function baseInput(overrides: Partial<ChangeImpactInput> = {}): ChangeImpactInput {
  return {
    projectId: "p1",
    originalText: "Cambio de prueba",
    currentPhase: "after_baseline",
    clarityLevel: 3,
    urgencyLevel: 3,
    developmentMode: "hybrid",
    affectedArtifacts: { ...emptyArtifacts },
    securityImpact: 0,
    dataImpact: 0,
    integrationImpact: 0,
    testingRequired: false,
    clientAvailabilityRisk: 0.15,
    ...overrides,
  };
}

describe("Motor de control de cambios — 5 casos del addendum v6", () => {
  it("Caso 1: ajuste menor al inicio (riesgo bajo, sin nueva línea base, horas bajas)", () => {
    const r = computeChangeImpact(
      baseInput({
        currentPhase: "before_baseline",
        clarityLevel: 5,
        affectedArtifacts: { ...emptyArtifacts, uiScreens: 1 },
      }),
    );
    expect(r.riskLevel).toBe("bajo");
    expect(r.requiresNewBaseline).toBe(false);
    expect(r.probableHours).toBeLessThan(20);
    expect(r.suggestedType).toBe("correccion");
  });

  it("Caso 2: botón con permisos y reporte después de pruebas (mejora, requiere aprobación, aumenta calendario)", () => {
    const r = computeChangeImpact(
      baseInput({
        currentPhase: "after_testing",
        clarityLevel: 4,
        affectedArtifacts: {
          ...emptyArtifacts,
          uiScreens: 1,
          apiEndpoints: 1,
          databaseTables: 1,
          reports: 1,
          rolesPermissions: 1,
          automatedTests: 3,
          manualTestScenarios: 4,
          documentsOrTrainingItems: 1,
        },
        securityImpact: 1,
        dataImpact: 1,
      }),
    );
    expect(["nuevo_alcance", "mejora"]).toContain(r.suggestedType);
    expect(r.requiresFormalApproval).toBe(true);
    expect(r.calendarImpactDays).toBeGreaterThan(2);
    expect(r.breakdown.phaseFactor).toBe(2.2);
  });

  it("Caso 3: cambio estructural en producción (crítico, modeFactor con piso 0.90 aunque sea bytecoding)", () => {
    const r = computeChangeImpact(
      baseInput({
        currentPhase: "in_production",
        clarityLevel: 3,
        developmentMode: "bytecoding_prompts",
        affectedArtifacts: {
          ...emptyArtifacts,
          databaseTables: 3,
          externalIntegrations: 2,
          businessRules: 4,
          rolesPermissions: 2,
        },
        securityImpact: 3,
        dataImpact: 3,
        integrationImpact: 3,
      }),
    );
    expect(r.riskLevel).toBe("critico");
    expect(r.requiresNewBaseline).toBe(true);
    expect(r.breakdown.modeFactor).toBe(0.68);
    expect(r.breakdown.modeFactorAdjusted).toBe(0.9);
    expect(r.breakdown.appliedFloor).toBe(true);
    expect(r.breakdown.appliedRiskPenalty).toBe(true); // bytecoding + alto riesgo → penalización aditiva
    expect(r.suggestedType).toBe("cambio_estructural");
  });

  it("Caso 4: cambio vago (claridad 1) genera preguntas de aclaración", () => {
    const r = computeChangeImpact(
      baseInput({
        clarityLevel: 1,
        originalText: "Que jale el botón",
        affectedArtifacts: { ...emptyArtifacts, uiScreens: 1 },
      }),
    );
    expect(r.questionsToClarify.length).toBeGreaterThanOrEqual(2);
    expect(r.questionsToClarify.some((q) => q.toLowerCase().includes("usuario"))).toBe(true);
    expect(r.breakdown.clarityFactor).toBe(1.6);
    expect(r.explanation.some((e) => e.toLowerCase().includes("vaga") || e.toLowerCase().includes("aclaración"))).toBe(true);
  });

  it("Caso 5: comparación de modos — bytecoding < hybrid < traditional cuando NO hay alto riesgo", () => {
    const baseArtifacts: AffectedArtifactInput = {
      ...emptyArtifacts,
      uiScreens: 2,
      apiEndpoints: 2,
      businessRules: 2,
      reports: 1,
    };
    const trad = computeChangeImpact(baseInput({ developmentMode: "traditional", affectedArtifacts: baseArtifacts }));
    const hybrid = computeChangeImpact(baseInput({ developmentMode: "hybrid", affectedArtifacts: baseArtifacts }));
    const byte = computeChangeImpact(baseInput({ developmentMode: "bytecoding_prompts", affectedArtifacts: baseArtifacts }));

    expect(trad.probableHours).toBeGreaterThan(hybrid.probableHours);
    expect(hybrid.probableHours).toBeGreaterThan(byte.probableHours);
    expect(trad.breakdown.appliedFloor).toBe(false);
    expect(byte.breakdown.appliedFloor).toBe(false);
  });

  it("Caso 5b: con alto riesgo, low_code se acerca a tradicional (piso + penalización)", () => {
    const baseArtifacts: AffectedArtifactInput = {
      ...emptyArtifacts,
      uiScreens: 2,
      databaseTables: 1,
      externalIntegrations: 1,
      rolesPermissions: 1,
    };
    const trad = computeChangeImpact(baseInput({
      developmentMode: "traditional",
      affectedArtifacts: baseArtifacts,
      securityImpact: 2, dataImpact: 2, integrationImpact: 2,
    }));
    const lowcode = computeChangeImpact(baseInput({
      developmentMode: "low_code",
      affectedArtifacts: baseArtifacts,
      securityImpact: 2, dataImpact: 2, integrationImpact: 2,
    }));
    // El descuento aparente del low_code se reduce por piso + penalización
    const ratio = lowcode.probableHours / trad.probableHours;
    expect(ratio).toBeGreaterThan(0.95); // muy cerca del tradicional, no 38% más barato
    expect(lowcode.breakdown.appliedFloor).toBe(true);
    expect(lowcode.breakdown.appliedRiskPenalty).toBe(true);
  });
});

describe("Validación de explicación y outputs auditables", () => {
  it("genera explanation con al menos 1 línea sobre artefactos afectados", () => {
    const r = computeChangeImpact(
      baseInput({
        affectedArtifacts: { ...emptyArtifacts, uiScreens: 1, databaseTables: 1, rolesPermissions: 1, reports: 1 },
      }),
    );
    expect(r.explanation.length).toBeGreaterThan(0);
    expect(r.explanation[0]).toMatch(/afecta/i);
  });

  it("optimista < probable < conservador siempre", () => {
    const r = computeChangeImpact(
      baseInput({
        clarityLevel: 2,
        affectedArtifacts: { ...emptyArtifacts, uiScreens: 2, businessRules: 1 },
      }),
    );
    expect(r.optimisticHours).toBeLessThan(r.probableHours);
    expect(r.probableHours).toBeLessThan(r.conservativeHours);
  });

  it("breakdown contiene todos los factores explícitos para auditoría (RNF-03)", () => {
    const r = computeChangeImpact(baseInput({ affectedArtifacts: { ...emptyArtifacts, uiScreens: 1 } }));
    expect(r.breakdown).toHaveProperty("artifactPoints");
    expect(r.breakdown).toHaveProperty("clarityFactor");
    expect(r.breakdown).toHaveProperty("phaseFactor");
    expect(r.breakdown).toHaveProperty("riskFactor");
    expect(r.breakdown).toHaveProperty("modeFactor");
    expect(r.breakdown).toHaveProperty("contingencyRate");
    expect(r.breakdown).toHaveProperty("baseHours");
    expect(r.breakdown).toHaveProperty("estimatedHours");
  });
});
