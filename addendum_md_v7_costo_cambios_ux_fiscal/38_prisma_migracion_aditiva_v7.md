# 38. Prisma - migración aditiva v7

## Objetivo

Agregar campos sin romper ChangeRequest ni ChangeImpactAssessment.

## Campos sugeridos para ChangeImpactAssessment

```prisma
model ChangeImpactAssessment {
  // existentes...
  clientPlainExplanationJson   String?  // explicación para Ayuntamiento
  providerTechnicalJson        String?  // desglose técnico
  financialBreakdownJson       String?  // desglose fiscal-laboral del cambio
  legalReferencesJson          String?  // LFT/LIVA/LISR/LSS/ISN usadas
  maintenanceImpactMonthly     Decimal? @default(0)
  minimumChargeApplied         Boolean  @default(false)
  freeChangeGuardrailReason    String?
  baselineBeforeVersion        Int?
  baselineAfterVersion         Int?
  sourceParameterKeysJson      String?  // claves Parameter usadas
  lastParameterReviewAt        DateTime?
}
```

## Nueva tabla opcional

Si se quiere guardar explicación por cálculo:

```prisma
model CalculationExplanation {
  id             String   @id @default(cuid())
  entityType     String   // estimate | change | cashflow | team
  entityId       String
  label          String
  formula        String
  inputJson      String
  outputJson     String
  sourceJson     String
  createdAt      DateTime @default(now())

  @@index([entityType, entityId])
}
```

## Reglas

- Mantener SQLite compatible.
- JSON como String.
- Decimal para montos.
- No borrar campos existentes.
- Ejecutar pruebas después de migración.
