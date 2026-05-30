# 37. SDS aditivo - Motor de cambios v7

## Ubicación

Extender, no reemplazar:

```text
lib/engine/change-impact.ts
lib/engine/change-types.ts
lib/engine/change-questions.ts
lib/engine/change-cost.ts
```

## Mejora 1 - cargar parámetros desde Parameter

Actualmente hay constantes hardcodeadas. Debe existir una función de adaptación:

```ts
loadChangeImpactParameters(year: number, state?: string): ChangeImpactParameters
```

Debe leer:

- CHANGE_ARTIFACT_WEIGHTS
- CHANGE_PHASE_FACTORS
- CHANGE_MODE_FACTORS
- CHANGE_CONTINGENCY_BY_TYPE
- CHANGE_HIGH_RISK_MODE_FLOOR
- CHANGE_MINIMUM_CHARGE_MXN
- CHANGE_HOURLY_RATE_DEFAULT_MXN

Si no existe un parámetro, usar fallback seguro y advertir en explanation.

## Mejora 2 - desglose financiero del cambio

Agregar salida:

```ts
type ChangeFinancialBreakdown = {
  laborCost: number;
  imssEstimated: number;
  isnEstimated: number;
  adminOverhead: number;
  contingencyAmount: number;
  subtotalBeforeVat: number;
  vat: number;
  totalInvoice: number;
  maintenanceMonthlyImpact: number;
};
```

## Mejora 3 - impacto en mantenimiento

Un cambio debe poder aumentar mantenimiento mensual si:

- agrega módulo;
- agrega integración;
- agrega datos sensibles;
- agrega reporte recurrente;
- aumenta usuarios o roles;
- cambia seguridad.

Regla inicial:

```text
maintenanceImpactMonthly = max(0, subtotalBeforeVat * maintenanceRateByRisk)
```

Rangos sugeridos:

- bajo: 0.5% mensual del cambio
- medio: 1.0%
- alto: 1.5%
- crítico: 2.0%

## Mejora 4 - decisión segura

No permitir “incluido sin costo” si:

- requiresFormalApproval = true;
- costImpact > CHANGE_FREE_CHANGE_LIMIT_MXN;
- phase is after_testing, after_acceptance or in_production;
- riskLevel is alto or critico.

Debe pedir comentario y usuario autorizador.

## Mejora 5 - explicación dual

El motor debe devolver dos textos:

```ts
plainExplanationForClient: string[];
technicalExplanationForProvider: string[];
```

Ejemplo cliente:

```text
Parece una pantalla nueva, pero también cambia permisos y reporte. Por eso no es garantía.
```

Ejemplo proveedor:

```text
artifactPoints=64, phaseFactor=2.2, modeFactor=0.90 por alto riesgo, contingency=20%.
```
