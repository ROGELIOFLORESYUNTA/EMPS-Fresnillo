# 27. Addendum SDS - Motor de estimación de cambios

## 1. Ubicación propuesta

Agregar lógica pura en:

```text
lib/engine/change-impact.ts
lib/engine/change-types.ts
lib/engine/change-questions.ts
```

No mezclar cálculo con UI. La UI captura datos; el motor calcula.

## 2. Entrada del motor

```ts
export type ChangeImpactInput = {
  projectId: string;
  changeRequestId?: string;
  originalText: string;
  currentPhase: ChangePhase;
  requestedType?: ChangeType;
  clarityLevel: 1 | 2 | 3 | 4 | 5;
  urgencyLevel: 1 | 2 | 3 | 4 | 5;
  developmentMode: 'traditional' | 'ai_assisted' | 'hybrid' | 'bytecoding_prompts' | 'low_code';
  affectedArtifacts: AffectedArtifactInput;
  securityImpact: 0 | 1 | 2 | 3;
  dataImpact: 0 | 1 | 2 | 3;
  integrationImpact: 0 | 1 | 2 | 3;
  testingRequired: boolean;
  clientAvailabilityRisk: number;
};
```

## 3. Fases del proyecto

```ts
export type ChangePhase =
  | 'before_baseline'
  | 'after_baseline'
  | 'in_development'
  | 'after_integration'
  | 'after_testing'
  | 'after_acceptance'
  | 'in_production';
```

Factores iniciales:

| Fase | Factor |
|---|---:|
| before_baseline | 0.70 |
| after_baseline | 1.00 |
| in_development | 1.35 |
| after_integration | 1.70 |
| after_testing | 2.20 |
| after_acceptance | 2.60 |
| in_production | 3.00 |

Interpretación: no es castigo automático. Es costo de coordinación, retrabajo, pruebas, aceptación y despliegue.

## 4. Artefactos afectados

```ts
export type AffectedArtifactInput = {
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
};
```

Pesos base sugeridos:

```ts
const ARTIFACT_WEIGHTS = {
  uiScreens: 6,
  apiEndpoints: 8,
  businessRules: 10,
  databaseTables: 14,
  reports: 10,
  rolesPermissions: 12,
  externalIntegrations: 24,
  dataMigrationObjects: 18,
  automatedTests: 4,
  manualTestScenarios: 3,
  documentsOrTrainingItems: 2,
};
```

## 5. Factores de modo de desarrollo

```ts
const CHANGE_MODE_FACTOR = {
  traditional: 1.00,
  ai_assisted: 0.88,
  hybrid: 0.78,
  bytecoding_prompts: 0.68,
  low_code: 0.62,
};
```

Regla de seguridad: si el cambio afecta base de datos, seguridad o integración externa con impacto alto, el factor mínimo no debe bajar de 0.90 aunque el modo sea bytecoding o low-code.

```ts
function applyModeFloor(modeFactor: number, input: ChangeImpactInput) {
  const highRisk = input.securityImpact >= 2 || input.dataImpact >= 2 || input.integrationImpact >= 2;
  return highRisk ? Math.max(modeFactor, 0.90) : modeFactor;
}
```

## 6. Fórmula conceptual

```ts
artifactPoints = sum(artifactCount * artifactWeight)
clarityFactor = {1: 1.60, 2: 1.35, 3: 1.15, 4: 1.05, 5: 1.00}[clarityLevel]
phaseFactor = PHASE_FACTOR[currentPhase]
riskFactor = 1 + (securityImpact * 0.08) + (dataImpact * 0.07) + (integrationImpact * 0.10) + clientAvailabilityRisk
modeFactor = applyModeFloor(CHANGE_MODE_FACTOR[developmentMode], input)
baseHours = artifactPoints * clarityFactor * phaseFactor * riskFactor * modeFactor
contingency = baseHours * contingencyRate
estimatedHours = baseHours + contingency
```

Contingencia sugerida:

- Corrección: 5%.
- Ajuste menor: 8%.
- Mejora: 12%.
- Nuevo alcance: 15%.
- Cambio estructural: 20%.

## 7. Salida del motor

```ts
export type ChangeImpactResult = {
  suggestedType: ChangeType;
  estimatedHours: number;
  optimisticHours: number;
  probableHours: number;
  conservativeHours: number;
  phaseFactor: number;
  modeFactor: number;
  riskLevel: 'bajo' | 'medio' | 'alto' | 'critico';
  calendarImpactDays: number;
  costImpact: number;
  requiresNewBaseline: boolean;
  requiresFormalApproval: boolean;
  explanation: string[];
  questionsToClarify: string[];
};
```

## 8. Explicaciones obligatorias

El motor debe devolver frases claras:

- "El cambio parece pequeño para el usuario, pero toca base de datos y permisos".
- "Se solicita después de pruebas, por eso aumenta retrabajo y validación".
- "La codificación con prompts reduce tiempo de implementación, pero no elimina pruebas ni aceptación".
- "Por el impacto en integración externa, se requiere aprobación formal".

## 9. Regla de no absorción invisible

Si `requiresFormalApproval = true`, el sistema no debe permitir marcar el cambio como "incluido sin costo" sin comentario de autorización.
