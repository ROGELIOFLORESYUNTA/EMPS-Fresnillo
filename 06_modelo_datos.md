# Modelo de datos

> **Fuente única de verdad reconciliada** PDF §8 + .md prototipo + campos operacionales. Última revisión 2026-05-01 (Fase B reconciliación).

## Project

| Campo | Tipo | Descripción |
|---|---|---|
| id | UUID/INT (PK) | Identificador único |
| name | string | Nombre del proyecto |
| description | text | Descripción detallada |
| client | string | Cliente (Ayuntamiento, dependencia) |
| client_type | enum | Tipo de cliente (municipal, paramunicipal, externo) |
| municipal_area | string | Área usuaria municipal |
| objective | text | Objetivo administrativo |
| system_type | enum | Tipo de sistema (CRUD interno, portal ciudadano, integrador, etc.) |
| responsible | string | Responsable del proyecto |
| estimated_budget | decimal | Presupuesto estimado inicial (referencia) |
| target_date | date | Fecha objetivo de entrega |
| priority | enum | Prioridad (baja, media, alta, crítica) |
| status | enum | Estado (borrador, captura, estimado, aprobado, en ejecución, cerrado, archivado) |
| notes | text | Notas y observaciones |
| created_at | timestamp | Fecha de creación |
| updated_at | timestamp | Última modificación |

## Module

| Campo | Tipo | Descripción |
|---|---|---|
| id | PK | |
| project_id | FK Project | |
| name | string | |
| type | enum | (catálogo, transaccional, reporte, integración, etc.) |
| description | text | |
| complexity | int 1-5 | Complejidad funcional |
| clarity | int 1-5 | Claridad del requerimiento (1=incompleto, 5=listo para estimar) |
| criticality | int 1-5 | Criticidad |
| screens_count | int | Pantallas estimadas |
| reports_count | int | Reportes estimados |
| catalogs_count | int | Catálogos requeridos |
| integrations_count | int | Integraciones externas |
| roles_permissions | text | Roles y permisos requeridos |
| sensitive_data | bool | ¿Maneja datos personales o sensibles? |
| notes | text | |

## UserStory

| Campo | Tipo | Descripción |
|---|---|---|
| id | PK | |
| module_id | FK Module | |
| actor | string | Actor o rol |
| need | text | Necesidad |
| benefit | text | Beneficio esperado |
| rules | text | Reglas de negocio |
| data_required | text | Datos requeridos |
| acceptance_criteria | text | Criterios de aceptación |
| evidence_expected | text | Evidencia esperada |
| maturity_level | int 1-5 | Madurez del requerimiento |
| risks | text | Riesgos identificados |
| priority | enum | |
| status | enum | (borrador, validada, lista, descartada) |

## TeamProfile

| Campo | Tipo | Descripción |
|---|---|---|
| id | PK | |
| project_id | FK Project | |
| name | string | Nombre del rol/perfil (no obligatorio identificar persona) |
| role | enum | Líder técnico, dev senior, dev junior, analista, tester, diseñador, soporte, contador, administrativo |
| level | enum | (junior, mid, senior, lead) |
| monthly_salary | decimal | Salario base mensual |
| hourly_cost | decimal | Costo por hora derivado |
| availability_percent | int 0-100 | % de disponibilidad real |
| months_assigned | decimal | Meses asignados al proyecto |
| contract_type | enum | (asimilados, honorarios, nómina, RESICO PF, freelance) |
| productivity_factor | decimal | Factor de productividad esperado (0-1.5) |
| turnover_risk | int 1-5 | Riesgo de salida |
| supervision_required | int 1-5 | Necesidad de supervisión |
| notes | text | |

## Parameter

| Campo | Tipo | Descripción |
|---|---|---|
| id | PK | |
| year | int | Ejercicio fiscal |
| country | string | (default Mexico) |
| state | string | (default Zacatecas) — para parámetros locales |
| key | string | Identificador único (ej. UMA_DIARIA, ISN_ZACATECAS) |
| value | decimal/text | Valor (puede ser tabla serializada para CEAV/vacaciones) |
| unit | string | (rate, MXN, dias_salario, table, etc.) |
| base | string | Base de cálculo (SBC, UMA, SBC_EXCEDENTE_3_UMA, etc.) |
| source | string | Fundamento legal exacto |
| source_url | string | URL oficial |
| effective_from | date | Fecha de inicio de vigencia |
| effective_until | date | Fecha de fin (null = vigente) |
| notes | text | Aclaraciones |

## Estimate

| Campo | Tipo | Descripción |
|---|---|---|
| id | PK | |
| project_id | FK Project | |
| version | int | Versión incremental por proyecto (no se sobrescriben) |
| mode | enum | (traditional, assisted, bytecoding, hybrid) |
| scenario | enum | (optimistic, probable, conservative) |
| analysis_hours | decimal | |
| design_hours | decimal | |
| coding_hours | decimal | |
| review_hours | decimal | |
| testing_hours | decimal | |
| documentation_hours | decimal | |
| deployment_hours | decimal | |
| training_hours | decimal | |
| support_hours | decimal | Soporte inicial |
| hardening_hours | decimal | Solo aplica para bytecoding |
| direct_cost | decimal | |
| indirect_cost | decimal | |
| subtotal | decimal | |
| vat | decimal | IVA trasladado |
| total | decimal | Subtotal + IVA |
| margin | decimal | Margen aplicado |
| isr_estimated | decimal | ISR preliminar |
| risk_score | decimal | Score agregado (técnico+req+fiscal+flujo+cambios) |
| parameters_snapshot | json | Snapshot de los parámetros usados (auditoría) |
| created_by | FK User | |
| created_at | timestamp | |

## ChangeRequest

| Campo | Tipo | Descripción |
|---|---|---|
| id | PK | |
| project_id | FK Project | |
| module_id | FK Module (nullable) | |
| requester | string | Solicitante |
| description | text | |
| type | enum | (corrección, garantía, ajuste menor, mejora, nuevo alcance) |
| reason | text | Causa raíz |
| time_impact_hours | decimal | |
| cost_impact | decimal | |
| testing_impact | text | |
| training_impact | text | |
| documentation_impact | text | |
| decision | enum | (pendiente, aceptado, rechazado, incluido) |
| decided_by | string | |
| decided_at | timestamp | |
| created_at | timestamp | |

## CashFlowLine

| Campo | Tipo | Descripción |
|---|---|---|
| id | PK | |
| project_id | FK Project | |
| month_number | int | Mes 1, 2, 3... |
| income | decimal | Ingresos del mes (anticipo, entregables, pago final) |
| payroll_outflow | decimal | Egreso nómina + cargas |
| tax_outflow | decimal | IVA/ISR/ISN provisionados |
| tools_outflow | decimal | Licencias, hosting, herramientas |
| admin_outflow | decimal | Administrativos |
| net_flow | decimal | income − sum(outflows) |
| accumulated_flow | decimal | Acumulado del mes anterior + net_flow |
| working_capital_required | decimal | abs(min(accumulated, 0)) |

## Notas de reconciliación (Fase B)

- **Project**: se agregaron `client`, `system_type`, `responsible`, `estimated_budget`, `target_date`, `notes` que aparecían en el PDF §8 y faltaban en el .md.
- **TeamProfile**: se unificaron campos del PDF (`hourly_cost`, `productivity_factor`) y del .md (`turnover_risk`, `supervision_required`); ambos conjuntos son útiles.
- **Estimate**: se agregaron `version`, `parameters_snapshot`, `support_hours`, `hardening_hours`, `isr_estimated` para soportar RNF-03 (auditabilidad) y la diferenciación de bytecoding (que sí tiene componente de hardening).
- **Module**: se agregó `catalogs_count` y `roles_permissions` que aparecen en el PDF como elementos a capturar (RF-03).
- **UserStory**: se agregó `evidence_expected` y `risks` mencionados en el PDF §8.
- **Parameter**: se agregó `country`, `base` (base de cálculo), `effective_until`, alineado con el formato del JSON seed [17_seed_data_parametros_2026.json](17_seed_data_parametros_2026.json).
- **CashFlowLine**: se renombró `accumulated_flow` para incluir `working_capital_required` derivado.
