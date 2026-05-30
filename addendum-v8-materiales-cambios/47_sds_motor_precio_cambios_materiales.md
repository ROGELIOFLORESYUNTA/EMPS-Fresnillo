# 47 - SDS: motor de precio de cambios con materiales

## Estado actual que se conserva

El motor actual `lib/engine/change-impact.ts` ya calcula impacto con:
- pesos por artefacto (`DEFAULT_ARTIFACT_WEIGHTS`)
- factor de claridad
- factor de fase
- factor de modo de desarrollo
- contingencia por tipo de cambio
- desglose financiero preliminar

No reemplazar este motor. Agregar funciones puras nuevas.

## Nuevo modulo sugerido

Crear:

```ts
lib/engine/resource-cost.ts
lib/engine/change-materials.ts
```

## Tipos principales

```ts
export type ResourceCategory =
  | 'equipo_computo'
  | 'mobiliario'
  | 'software_licencia'
  | 'cloud'
  | 'renta'
  | 'internet'
  | 'energia_agua'
  | 'contabilidad_admin'
  | 'transporte'
  | 'consultoria'
  | 'otros';

export type AcquisitionMode =
  | 'existing_owned'
  | 'used_owned'
  | 'new_with_invoice'
  | 'new_without_invoice'
  | 'rented'
  | 'financed'
  | 'subscription';
```

## Formula de recurso

```ts
grossBeforeVat = quantity * unitCostBeforeVat
allocatedBeforeVat = grossBeforeVat * allocationPercent
vatTransferred = allocatedBeforeVat * vatRate
vatCreditable = vatTransferred * vatCreditablePercent
cashOutflow = allocatedBeforeVat + vatTransferred
monthlyAllocatedCost = allocatedBeforeVat / monthsAllocated
```

Reglas:
- `new_with_invoice`: permite IVA acreditable estimado si el gasto es indispensable y se paga/documenta.
- `new_without_invoice`: IVA acreditable = 0 y deducibilidad = baja/conflictiva.
- `existing_owned`: no genera salida nueva de efectivo, pero puede asignar costo de uso o depreciacion interna.
- `subscription` o `rented`: costo mensual recurrente.
- `financed`: separar enganche y pagos mensuales.

## Formula integrada de cambio v8

```ts
changeLabor = probableHours * hourlyRate
resourceSummary = computeResourceSummary(resources)
fiscalLabor = imssEstimated + isnEstimated + lftProvisionIfApplicable
adminOverhead = changeLabor * adminOverheadRate
subtotalBeforeVat = changeLabor + fiscalLabor + adminOverhead + contingencyAmount + resourceSummary.allocatedBeforeVat
vatTransferred = subtotalBeforeVat * IVA_GENERAL
netVatEstimate = max(0, vatTransferred - resourceSummary.vatCreditable)
totalInvoice = subtotalBeforeVat + vatTransferred
cashflowImpactMonth1 = resourceSummary.cashOutflowMonth1 + payrollOutflow + taxOutflow
```

## Salidas nuevas

```ts
{
  internalCostBeforeVat,
  subtotalBeforeVat,
  vatTransferred,
  vatCreditableEstimated,
  netVatEstimate,
  totalInvoice,
  cashflowImpact,
  materialWarnings,
  fiscalWarnings,
  explanationForClient,
  explanationForProvider
}
```

## Diferencia clave

`costImpact` no debe confundirse con `totalInvoice`.

- costo interno = costo para el proveedor
- precio antes de IVA = base de cobro
- IVA trasladado = impuesto al cliente
- IVA acreditable = posible reduccion del IVA por compras con CFDI
- total a facturar = precio al cliente con IVA
- bache de caja = dinero que el proveedor necesita antes de cobrar
