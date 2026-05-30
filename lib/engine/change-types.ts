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

  // === Addendum v7 (opcionales, no rompen tests v6) ===

  /** Explicación en lenguaje claro para el cliente (Ayuntamiento). Sin jerga técnica. */
  plainExplanationForClient?: string[];
  /** Explicación técnica para el proveedor: desglose numérico de fórmula. */
  technicalExplanationForProvider?: string[];
  /** Desglose fiscal-laboral del costo del cambio. */
  financialBreakdown?: ChangeFinancialBreakdown;
  /** Costo mensual adicional que el cambio agregará al mantenimiento. */
  maintenanceImpactMonthly?: number;
  /** Referencias legales aplicables (LIVA art.1, LFT art.50, LSS art.106...). */
  legalReferences?: string[];
  /** Claves de Parameter usadas en este cálculo (auditoría). */
  parameterSourceKeys?: string[];
  /** Claves que NO existían en DB y usaron default. Advierte al usuario. */
  fallbackWarnings?: string[];
  /** Si el sistema bloqueó "incluido sin costo", explica por qué. */
  freeChangeGuardrailReason?: string | null;
  /** True si el costo subió al mínimo configurado (CHANGE_MINIMUM_CHARGE_MXN). */
  minimumChargeApplied?: boolean;
}

/**
 * Desglose fiscal-laboral del costo del cambio (v7).
 * Permite mostrar al proveedor cuánto del costo es nómina vs impuestos vs mantenimiento.
 */
export interface ChangeFinancialBreakdown {
  /** Costo de la mano de obra (horas × tarifa). */
  laborCost: number;
  /** IMSS patronal estimado (sobre laborCost). */
  imssEstimated: number;
  /** ISN Zacatecas + UAZ sobre laborCost. */
  isnEstimated: number;
  /** Overhead administrativo (proporcional a laborCost). */
  adminOverhead: number;
  /** Contingencia en MXN. */
  contingencyAmount: number;
  /** Suma antes del IVA. */
  subtotalBeforeVat: number;
  /** IVA 16%. */
  vat: number;
  /** Total a facturar (subtotal + IVA). */
  totalInvoice: number;
  /** Impacto mensual incremental sobre el costo de mantenimiento. */
  maintenanceMonthlyImpact: number;
}

/**
 * Parámetros del motor de cambios v7. Cargados desde tabla Parameter
 * con fallback seguro a valores DEFAULT_CHANGE_PARAMETERS si la clave no existe.
 */
export interface ChangeImpactParameters {
  artifactWeights: Record<keyof AffectedArtifactInput, number>;
  clarityFactor: Record<1 | 2 | 3 | 4 | 5, number>;
  phaseFactor: Record<ChangePhase, number>;
  modeFactor: Record<ChangeDevelopmentMode, number>;
  contingencyByType: Record<ChangeType, number>;
  highRiskModeFloor: number;
  /** Costo mínimo en MXN para un change request (evita cobrar nada). */
  minimumChargeMxn: number;
  /** Tarifa por hora default si no se entrega. */
  hourlyRateDefaultMxn: number;
  /** Tope debajo del cual se puede aceptar "incluido sin costo" sin guardrail. */
  freeChangeLimitMxn: number;
  /** % del subtotal que se suma al mantenimiento mensual según riesgo. */
  maintenanceRateByRisk: Record<ChangeRiskLevel, number>;
  // === Metadatos de carga ===
  /** Claves leídas exitosamente desde Parameter. */
  loadedKeys: string[];
  /** Claves no encontradas; usaron default. Se muestra como warning. */
  fallbackWarnings: string[];
  /** ISO timestamp de la carga. */
  loadedAt: string;
}
