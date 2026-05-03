# 30. Addendum API - Control de cambios

## Endpoints sugeridos

```text
POST /api/projects/[id]/changes/[changeId]/impact
GET  /api/projects/[id]/changes/[changeId]/impact
PUT  /api/projects/[id]/changes/[changeId]/impact
POST /api/projects/[id]/changes/[changeId]/approve
POST /api/projects/[id]/changes/[changeId]/reject
POST /api/projects/[id]/changes/[changeId]/defer
POST /api/projects/[id]/changes/[changeId]/request-clarification
```

## POST impact - request

```json
{
  "originalText": "Agregar botón para autorización del director",
  "currentPhase": "after_testing",
  "clarityLevel": 3,
  "urgencyLevel": 4,
  "developmentMode": "hybrid",
  "affectedArtifacts": {
    "uiScreens": 1,
    "apiEndpoints": 1,
    "businessRules": 2,
    "databaseTables": 1,
    "reports": 1,
    "rolesPermissions": 1,
    "externalIntegrations": 0,
    "dataMigrationObjects": 0,
    "automatedTests": 3,
    "manualTestScenarios": 4,
    "documentsOrTrainingItems": 1
  },
  "securityImpact": 1,
  "dataImpact": 1,
  "integrationImpact": 0,
  "testingRequired": true,
  "clientAvailabilityRisk": 0.15
}
```

## POST impact - response

```json
{
  "suggestedType": "mejora",
  "estimatedHours": 42.5,
  "optimisticHours": 34.0,
  "probableHours": 42.5,
  "conservativeHours": 55.3,
  "calendarImpactDays": 7,
  "costImpact": 27800,
  "riskLevel": "medio",
  "requiresNewBaseline": true,
  "requiresFormalApproval": true,
  "explanation": [
    "La solicitud modifica flujo de autorización, permisos, base de datos y reporte.",
    "Se solicita después de pruebas, por eso aumenta retrabajo y validación.",
    "El modo híbrido reduce codificación, pero no elimina pruebas ni aceptación."
  ],
  "questionsToClarify": [
    "¿Quién puede autorizar además del director?",
    "¿Debe quedar historial de autorizaciones?",
    "¿El reporte mensual debe mostrar fecha y usuario que autorizó?"
  ]
}
```

## Validación Zod

Agregar esquema en `lib/validators.ts`:

```ts
export const changeImpactInputSchema = z.object({
  originalText: z.string().min(10),
  currentPhase: z.string(),
  clarityLevel: z.number().int().min(1).max(5),
  urgencyLevel: z.number().int().min(1).max(5),
  developmentMode: z.string(),
  affectedArtifacts: z.object({
    uiScreens: z.number().int().min(0),
    apiEndpoints: z.number().int().min(0),
    businessRules: z.number().int().min(0),
    databaseTables: z.number().int().min(0),
    reports: z.number().int().min(0),
    rolesPermissions: z.number().int().min(0),
    externalIntegrations: z.number().int().min(0),
    dataMigrationObjects: z.number().int().min(0),
    automatedTests: z.number().int().min(0),
    manualTestScenarios: z.number().int().min(0),
    documentsOrTrainingItems: z.number().int().min(0),
  }),
  securityImpact: z.number().int().min(0).max(3),
  dataImpact: z.number().int().min(0).max(3),
  integrationImpact: z.number().int().min(0).max(3),
  testingRequired: z.boolean(),
  clientAvailabilityRisk: z.number().min(0).max(0.5),
});
```
