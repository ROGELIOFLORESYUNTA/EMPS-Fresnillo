# 39. API endpoints v7

## Endpoints existentes

Mantener:

```text
POST /api/projects/[id]/changes/[changeId]/impact
POST /api/projects/[id]/changes/[changeId]/decision
```

## Mejoras

### GET impact

```text
GET /api/projects/[id]/changes/[changeId]/impact
```

Devuelve última evaluación persistida.

### POST preview

```text
POST /api/projects/[id]/changes/preview
```

Permite estimar un cambio antes de registrarlo formalmente.

### GET explanation

```text
GET /api/calculation-explanations?entityType=change&entityId=...
```

Devuelve fórmula, insumos y fuentes.

### POST approve-baseline

```text
POST /api/projects/[id]/changes/[changeId]/approve-baseline
```

Crea nueva línea base cuando el cambio es estructural o nuevo alcance.

## Respuesta estándar del endpoint impact

```json
{
  "riskLevel": "alto",
  "suggestedType": "nuevo_alcance",
  "probableHours": 42.5,
  "calendarImpactDays": 6,
  "costImpact": 32500,
  "requiresFormalApproval": true,
  "requiresNewBaseline": true,
  "plainExplanationForClient": [],
  "technicalExplanationForProvider": [],
  "financialBreakdown": {},
  "questionsToClarify": []
}
```
