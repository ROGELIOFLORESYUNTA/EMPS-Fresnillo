# 48 - Prisma: migracion aditiva para materiales y overhead

Agregar modelos nuevos. No modificar destructivamente los actuales.

```prisma
model ProjectResourceCost {
  id                       String   @id @default(cuid())
  workspaceId              String
  projectId                String
  changeRequestId          String?

  category                 String
  description              String
  acquisitionMode          String

  quantity                 Decimal  @default(1)
  unitCostBeforeVat        Decimal  @default(0)
  vatRate                  Decimal  @default(0.16)
  vatCreditablePercent     Decimal  @default(1.0)
  invoiceStatus            String   @default("pending") // cfdi_valid|pending|no_invoice|not_applicable

  allocationPercent        Decimal  @default(1.0)
  monthsAllocated          Decimal  @default(1.0)
  cashOutflowMonth         Int      @default(1)

  capitalizedAsset         Boolean  @default(false)
  depreciationRateAnnual   Decimal?
  usefulLifeMonths         Int?

  isRecurring              Boolean  @default(false)
  monthlyCostBeforeVat     Decimal?

  notes                    String?
  createdAt                DateTime @default(now())
  updatedAt                DateTime @updatedAt

  project                  Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@index([workspaceId])
  @@index([projectId])
  @@index([changeRequestId])
  @@index([category])
}

model ResourceCostExplanation {
  id                       String   @id @default(cuid())
  workspaceId              String
  projectId                String
  resourceCostId           String?
  calculationType          String // project_resource|change_resource|cashflow|vat
  inputSnapshotJson        String
  resultSnapshotJson       String
  legalReferencesJson      String?
  warningsJson             String?
  createdAt                DateTime @default(now())

  @@index([workspaceId])
  @@index([projectId])
  @@index([resourceCostId])
}
```

Si se desea relacion directa con `ChangeImpactAssessment`, no agregar FK obligatoria. Usar `changeRequestId` opcional para mantener compatibilidad.

Migracion SQLite/Postgres:
- usar `String` para categorias y estados
- usar `Decimal` para montos/tasas
- JSON como `String`
- no usar enums nativos
