# 49 - API endpoints para materiales y cambios

## Recursos del proyecto

```txt
GET    /api/projects/[id]/resources
POST   /api/projects/[id]/resources
PUT    /api/resources/[resourceId]
DELETE /api/resources/[resourceId]
POST   /api/projects/[id]/resources/preview
```

## Recursos asociados a cambios

```txt
GET    /api/changes/[id]/resources
POST   /api/changes/[id]/resources
POST   /api/changes/[id]/resources/preview-impact
POST   /api/changes/[id]/recalculate-with-resources
```

## Exportacion investigacion

```txt
GET /api/research/exports/resource-costs.csv
GET /api/research/exports/change-impact-v8.csv
```

## Validacion Zod

Agregar en `lib/validators.ts`:

```ts
export const resourceCostSchema = z.object({
  category: z.string().min(1),
  description: z.string().min(3),
  acquisitionMode: z.string().min(1),
  quantity: z.coerce.number().positive(),
  unitCostBeforeVat: z.coerce.number().min(0),
  vatRate: z.coerce.number().min(0).max(0.16).default(0.16),
  vatCreditablePercent: z.coerce.number().min(0).max(1).default(1),
  invoiceStatus: z.string().default('pending'),
  allocationPercent: z.coerce.number().min(0).max(1).default(1),
  monthsAllocated: z.coerce.number().positive().default(1),
  cashOutflowMonth: z.coerce.number().int().min(1).default(1),
  capitalizedAsset: z.coerce.boolean().default(false),
  depreciationRateAnnual: z.coerce.number().min(0).max(1).optional(),
  notes: z.string().optional(),
});
```
