/**
 * EMPS Fresnillo motor de estimacion.
 *
 * API publica del modulo de dominio. Sin I/O. Todas las funciones son puras.
 * Implementa 07_motor_formulas.md (reconciliado Fase B 2026-05-01).
 */

export * from "./types";
export * from "./effort";
export * from "./cost";
export * from "./cashflow";
export * from "./risk";
export * from "./metrics";
export * from "./lft-risk";
export { loadFiscalRatesFromSeed } from "./seedAdapter";

// Control de cambios v6 (Addendum 26-34)
export * from "./change-types";
export { computeChangeImpact, ARTIFACT_WEIGHTS, CLARITY_FACTOR as CHANGE_CLARITY_FACTOR, PHASE_FACTOR as CHANGE_PHASE_FACTOR, MODE_FACTOR as CHANGE_MODE_FACTOR, CONTINGENCY_BY_TYPE as CHANGE_CONTINGENCY_BY_TYPE, HIGH_RISK_MODE_FLOOR } from "./change-impact";
export { buildClarificationQuestions } from "./change-questions";

// Addendum v8 — Recursos materiales y cambios con materiales
export type { ResourceCategory, AcquisitionMode, InvoiceStatus, ResourceCostInput, ResourceCostBreakdown, ResourceSummary } from "./resource-cost";
export { computeResourceCost, computeResourceSummary } from "./resource-cost";
export type { ChangeWithMaterialsInput, ChangeMaterialsBreakdown } from "./change-materials";
export { computeChangeWithMaterials } from "./change-materials";
