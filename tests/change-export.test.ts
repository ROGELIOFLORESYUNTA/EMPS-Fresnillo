/**
 * Tests para los helpers de exportación de evidencia de cambios (Addendum v7).
 */
import { describe, it, expect } from "vitest";
import { serializeChangesToJson, serializeChangesToCsv, type ChangeExportRow } from "@/lib/engine/change-export";

const sample: ChangeExportRow = {
  projectId: "proj1",
  projectName: 'Proyecto "Demo, con commas"',
  projectClient: "Ayuntamiento de Fresnillo",
  changeRequestId: "ch1",
  originalText: "Texto con\nsalto de línea y \"comillas\"",
  requesterName: "Director, Innovación",
  changeType: "mejora",
  changeDecision: "aceptado",
  changeDecidedBy: "Director",
  changeDecidedAt: "2026-05-30T12:00:00.000Z",
  assessmentId: "as1",
  assessmentSuggestedType: "mejora",
  assessmentFinalType: null,
  assessmentCurrentPhase: "in_development",
  assessmentDevelopmentMode: "hybrid",
  assessmentClarityLevel: 3,
  assessmentUrgencyLevel: 3,
  assessmentArtifactPoints: 64,
  assessmentClarityFactor: 1.15,
  assessmentPhaseFactor: 1.35,
  assessmentModeFactor: 0.78,
  assessmentRiskFactor: 1.24,
  assessmentContingencyRate: 0.15,
  assessmentProbableHours: 42.5,
  assessmentOptimisticHours: 36.1,
  assessmentConservativeHours: 53.1,
  assessmentEstimatedCost: 21250,
  assessmentCalendarImpactDays: 6,
  assessmentRiskLevel: "medio",
  assessmentRequiresNewBaseline: false,
  assessmentRequiresFormalApproval: false,
  assessmentMaintenanceImpactMonthly: 250,
  assessmentMinimumChargeApplied: false,
  assessmentFreeChangeGuardrailReason: null,
  assessmentBaselineBeforeVersion: null,
  assessmentBaselineAfterVersion: null,
  assessmentSourceParameterKeys: '["CHANGE_PHASE_FACTOR","CHANGE_MODE_FACTOR"]',
  assessmentLastParameterReviewAt: "2026-05-30T12:00:00.000Z",
  assessmentCreatedAt: "2026-05-30T11:00:00.000Z",
  exportedAt: "2026-05-30T12:00:00.000Z",
};

describe("serializeChangesToJson", () => {
  it("genera JSON parseable con metadatos y array de cambios", () => {
    const json = serializeChangesToJson([sample], "2026-05-30T12:00:00.000Z");
    const parsed = JSON.parse(json);
    expect(parsed.schemaVersion).toBe("v7.0");
    expect(parsed.exportedAt).toBe("2026-05-30T12:00:00.000Z");
    expect(parsed.count).toBe(1);
    expect(parsed.changes).toHaveLength(1);
    expect(parsed.changes[0].projectId).toBe("proj1");
    expect(parsed.changes[0].assessmentSourceParameterKeys).toContain("CHANGE_PHASE_FACTOR");
  });

  it("maneja array vacío", () => {
    const json = serializeChangesToJson([], "2026-05-30T12:00:00.000Z");
    const parsed = JSON.parse(json);
    expect(parsed.count).toBe(0);
    expect(parsed.changes).toEqual([]);
  });
});

describe("serializeChangesToCsv", () => {
  it("incluye BOM UTF-8 al inicio para que Excel lea acentos", () => {
    const csv = serializeChangesToCsv([sample]);
    expect(csv.charCodeAt(0)).toBe(0xFEFF);
  });

  it("escapa comillas dobles duplicándolas (RFC 4180)", () => {
    const csv = serializeChangesToCsv([sample]);
    // El nombre del proyecto contiene comillas y comma; debe estar entre comillas y con "" para escapar
    expect(csv).toContain('"Proyecto ""Demo, con commas"""');
  });

  it("envuelve en comillas las celdas con commas o saltos de línea", () => {
    const csv = serializeChangesToCsv([sample]);
    expect(csv).toContain('"Director, Innovación"');
    // El texto original tiene un \n: debe estar entre comillas
    expect(csv).toContain('"Texto con\nsalto de línea y ""comillas"""');
  });

  it("array vacío genera solo BOM y newline", () => {
    const csv = serializeChangesToCsv([]);
    expect(csv).toBe("﻿\n");
  });

  it("primera fila tiene los encabezados separados por commas", () => {
    const csv = serializeChangesToCsv([sample]);
    const lines = csv.replace(/^﻿/, "").split("\n");
    expect(lines[0]).toContain("projectId");
    expect(lines[0]).toContain("assessmentMaintenanceImpactMonthly");
  });
});
