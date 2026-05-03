# 28. Addendum de datos - Control de cambios

## 1. Principio

No borrar ni sustituir `ChangeRequest`. Agregar evaluación de impacto como modelo relacionado. La solicitud original puede existir aunque todavía no tenga evaluación.

## 2. Modelo sugerido

```prisma
model ChangeImpactAssessment {
  id                         String   @id @default(cuid())
  projectId                  String
  changeRequestId            String?  @unique
  estimateId                 String?

  originalText               String
  suggestedType              String
  finalType                  String?
  currentPhase               String
  developmentMode            String

  clarityLevel               Int
  urgencyLevel               Int
  affectedArtifactsJson      String

  artifactPoints             Decimal
  clarityFactor              Decimal
  phaseFactor                Decimal
  modeFactor                 Decimal
  riskFactor                 Decimal
  contingencyRate            Decimal

  optimisticHours            Decimal
  probableHours              Decimal
  conservativeHours          Decimal
  estimatedCost              Decimal
  calendarImpactDays         Int

  riskLevel                  String
  requiresNewBaseline        Boolean  @default(false)
  requiresFormalApproval     Boolean  @default(false)
  decisionStatus             String   @default("requires_review")
  decisionComment            String?
  decidedBy                  String?
  decidedAt                  DateTime?

  explanationJson            String
  questionsToClarifyJson     String
  parametersSnapshot         String
  createdAt                  DateTime @default(now())
  updatedAt                  DateTime @updatedAt
}
```

## 3. Campos opcionales para `ChangeRequest`

Si se decide ampliar el modelo existente:

```prisma
model ChangeRequest {
  // campos actuales...
  phaseAtRequest      String?
  clientOriginalText  String?
  approvedBy          String?
  approvalDate        DateTime?
  baselineVersion     Int?
  isWarrantyClaim     Boolean @default(false)
  isScopeIncrease     Boolean @default(false)
}
```

## 4. Índices sugeridos

```prisma
@@index([projectId])
@@index([changeRequestId])
@@index([currentPhase])
@@index([developmentMode])
@@index([decisionStatus])
```

## 5. Semilla de parámetros

Cargar `31_seed_parametros_control_cambios_2026.json` como parámetros de cambio. Mantener año, fuente interna y fecha efectiva.
