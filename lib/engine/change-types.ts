/**
 * Tipos del motor de control de cambios (Addendum v6).
 * Fuente: 26_addendum_srs_control_cambios.md, 27_addendum_sds_motor_control_cambios.md.
 *
 * Calibración 2026-05-03 ajustada con investigación de campo:
 *   - PMBOK 7 (contingencia 10-25% real, no 5-20%)
 *   - IFPUG (ratio integración/pantalla ~2-4×)
 *   - Forrester Wave Low-Code 2025 (varianza 0.62× a 1.5× según happy-path)
 *   - ITIL 4 (cambios standard/normal/emergency, sin piso numérico estándar)
 *   - Mountain Goat / DZone (curva de costo del cambio aplanada en agile/CI-CD moderna)
 */

export type ChangePhase =
  | "before_baseline"
  | "after_baseline"
  | "in_development"
  | "after_integration"
  | "after_testing"
  | "after_acceptance"
  | "in_production";

export type ChangeType =
  | "correccion"
  | "garantia"
  | "ajuste_menor"
  | "mejora"
  | "nuevo_alcance"
  | "cambio_estructural";

export type ChangeRiskLevel = "bajo" | "medio" | "alto" | "critico";

export type ChangeDevelopmentMode =
  | "traditional"
  | "ai_assisted"
  | "hybrid"
  | "bytecoding_prompts"
  | "low_code";

export interface AffectedArtifactInput {
  uiScreens: number;
  apiEndpoints: number;
  businessRules: number;
  databaseTables: number;
  reports: number;
  rolesPermissions: number;
  externalIntegrations: number;
  dataMigrationObjects: number;
  automatedTests: number;
  manualTestScenarios: number;
  documentsOrTrainingItems: number;
}

export interface ChangeImpactInput {
  projectId: string;
  changeRequestId?: string;
  originalText: string;
  currentPhase: ChangePhase;
  requestedType?: ChangeType;
  /** 1=texto vago/ambiguo, 5=requisito explícito y completo */
  clarityLevel: 1 | 2 | 3 | 4 | 5;
  /** 1=baja, 5=urgencia política/legal */
  urgencyLevel: 1 | 2 | 3 | 4 | 5;
  developmentMode: ChangeDevelopmentMode;
  affectedArtifacts: AffectedArtifactInput;
  /** 0=sin impacto, 3=PII/auth/criptografía */
  securityImpact: 0 | 1 | 2 | 3;
  /** 0=sin cambio en datos, 3=migración con riesgo de pérdida */
  dataImpact: 0 | 1 | 2 | 3;
  /** 0=sin integración, 3=integración con sistema externo crítico */
  integrationImpact: 0 | 1 | 2 | 3;
  testingRequired: boolean;
  /** 0..0.5 — qué tan poco disponible está el cliente para aclarar */
  clientAvailabilityRisk: number;
}

export interface ChangeImpactBreakdown {
  artifactPoints: number;
  clarityFactor: number;
  phaseFactor: number;
  riskFactor: number;
  modeFactor: number;
  modeFactorAdjusted: number;
  appliedFloor: boolean;
  appliedRiskPenalty: boolean;
  baseHours: number;
  contingencyRate: number;
  contingencyHours: number;
  estimatedHours: number;
}

export interface ChangeImpactResult {
  suggestedType: ChangeType;
  contingencyType: ChangeType;

  /** Horas */
  optimisticHours: number;
  probableHours: number;
  conservativeHours: number;
  estimatedHours: number; // alias de probableHours, por compatibilidad

  /** Costo estimado en MXN (probable) */
  costImpact: number;
  hourlyRateUsed: number;

  /** Días calendario equivalentes */
  calendarImpactDays: number;

  riskLevel: ChangeRiskLevel;
  requiresNewBaseline: boolean;
  requiresFormalApproval: boolean;

  /** Texto que se muestra al usuario en lenguaje claro */
  explanation: string[];
  /** Preguntas que el sistema sugiere hacer al solicitante */
  questionsToClarify: string[];

  breakdown: ChangeImpactBreakdown;
}
