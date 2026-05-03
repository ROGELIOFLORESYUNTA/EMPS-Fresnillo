# EMPS-Fresnillo — Handoff técnico para ChatGPT Pro

**Versión:** 0.2.0 (mayo 2026) · **Snapshot:** 2026-05-03
**Autor original:** Rogelio Flores Rodríguez · UAZ Ingeniería en Software
**Implementador:** Claude Code (Anthropic) · trabajo iterativo sobre la spec original

> **Propósito de este documento.** El proyecto ya está implementado y funcionando. Cuando se redactó la documentación de investigación con ChatGPT Pro, se propusieron decisiones técnicas (lenguaje, base de datos, frameworks) que durante la ejecución cambiaron por necesidad práctica. Este archivo captura el **estado real** para que ChatGPT pueda actualizar su contexto y seguir trabajando con base en lo construido, no en lo planeado.

---

## 1. Identidad y propósito

**EMPS-Fresnillo** = Estimador Municipal de Proyectos de Software con viabilidad técnica, fiscal-laboral, flujo de efectivo, bytecoding y control de cambios.

**Problema que ataca:** En proyectos municipales una cotización puede verse económica pero fallar en ejecución porque no se estimaron cambios, mantenimiento, nómina, impuestos, flujo de efectivo, rotación de personal ni forma real de desarrollo.

**Hipótesis:** Una estimación temprana mejora cuando integra esfuerzo técnico, modo de desarrollo, cambios y viabilidad fiscal-laboral antes de comprometer precio, calendario y mantenimiento.

**Regla rectora:** El sistema no debe calcular solamente horas. Debe responder si el proyecto es viable técnica y financieramente.

**Las 4 dimensiones integradas:**
1. **Técnica:** módulos, requerimientos, datos, integraciones, seguridad, pruebas, documentación, despliegue.
2. **Modo de desarrollo:** 5 modos calibrados con evidencia 2026 — `traditional`, `ai_assisted`, `hybrid`, `bytecoding_prompts`, `low_code`.
3. **Cambios y mantenimiento:** corrección, garantía, ajuste menor, mejora, nuevo alcance.
4. **Fiscal-laboral-financiera:** nómina, prestaciones LFT, IMSS por ramo, ISN+UAZ, IVA, ISR, riesgo LFT por contrato >6 meses, capital de trabajo, calendario de cobro.

---

## 2. Stack técnico **REAL** (no el de la spec original)

| Capa | Decisión original (spec) | **Decisión final implementada** |
|---|---|---|
| Frontend | React **o** Next.js | **Next.js 15.1.x (App Router) + React 19** |
| Backend | Node+Express **o** Python+FastAPI | **API Routes de Next.js (server-only)** |
| Lenguaje | JavaScript o Python | **TypeScript 5.7 strict mode** |
| ORM | Prisma **o** SQLAlchemy | **Prisma 6.1** |
| BD prototipo | SQLite | **SQLite (`prisma/prisma/dev.db`)** |
| BD producción | PostgreSQL | **PostgreSQL** (cambio vía `DATABASE_URL`, schema portable) |
| UI | (no especificado) | **Tailwind CSS 3.4 + componentes shadcn-style + Radix UI primitives + Lucide icons** |
| Validación | (no especificado) | **Zod 3.24** |
| Testing | (no especificado) | **Vitest 2.1 (unit, 26 tests) + Playwright 1.59 (E2E, 16 tests)** |
| Decimales | (no especificado) | **decimal.js + `Prisma.Decimal`** (precisión 18,4 montos / 18,6 tasas) |
| Estado | (no especificado) | **No hay estado global. URL searchParams + server components + revalidatePath** |
| Reportes | HTML→PDF | **HTML imprimible (Ctrl+P) — modo `?print=1` con CSS `@media print`** |

**Por qué Next.js App Router como monorrepo:** elimina la división frontend/backend, comparte tipos TypeScript end-to-end, server components leen Prisma directamente sin pasar por API REST cuando no se necesita, y las rutas API se mantienen para acciones client→server. Reduce overhead de un proyecto académico de un solo desarrollador.

**Por qué TypeScript estricto:** los cálculos fiscales/laborales son numéricos y un error de tipos en una multiplicación puede dar precios absurdos. `tsc --noEmit` corre en cada cambio.

---

## 3. Estructura de carpetas

```
EstimacionTemprana/
├── prisma/
│   ├── schema.prisma          # 25 modelos (Project, Module, ..., MLPrediction)
│   ├── seed.ts                # carga 17_seed_data_parametros_2026.json a Parameter
│   ├── reset-demo-realista.ts # 1 proyecto demo realista (Sistema integral de trámites)
│   └── prisma/dev.db          # SQLite local
├── lib/
│   ├── db.ts                  # PrismaClient singleton
│   ├── parameters.ts          # carga + snapshot de Parameters por año
│   ├── estimate-service.ts    # orquesta motor → persistencia → auditoría
│   ├── validators.ts          # esquemas Zod
│   ├── utils.ts               # formatMXN, DEVELOPMENT_MODES, SCENARIOS, RISK_LEVELS
│   └── engine/                # motor de dominio puro (sin I/O)
│       ├── effort.ts          # basePoints, claridad, riesgo, distribución por modo
│       ├── cost.ts            # costo por perfil (detallado IMSS + UMA escalonada CEAV)
│       ├── cashflow.ts        # ingreso/egreso mensual, capital de trabajo
│       ├── lft-risk.ts        # riesgo LFT por contrato >6 meses (NUEVO, ver §6)
│       ├── risk.ts            # riesgo agregado (técnico+req+fiscal+flujo+cambio)
│       ├── metrics.ts         # backtesting de modelos ML
│       ├── seedAdapter.ts     # mapea JSON seed → tipos engine
│       └── types.ts           # contratos del motor
├── app/
│   ├── page.tsx               # landing
│   ├── layout.tsx             # header sticky + footer con menú avanzado
│   ├── globals.css            # paleta gris-azul (no blanco puro)
│   ├── projects/              # CRUD proyectos
│   │   ├── page.tsx           # lista
│   │   ├── new/page.tsx       # crear
│   │   └── [id]/
│   │       ├── page.tsx               # detalle (selector mode/scenario via URL)
│   │       ├── modules/page.tsx       # CRUD módulos
│   │       ├── modules/[moduleId]/stories/page.tsx  # CRUD historias
│   │       ├── team/page.tsx          # CRUD equipo
│   │       ├── changes/page.tsx       # control de cambios
│   │       ├── estimate/page.tsx      # wizard estimación
│   │       └── reports/[type]/page.tsx # 3 reportes (municipal/proveedor/research)
│   ├── admin/                 # gestión de parámetros y datasets
│   │   ├── parametros/        # CRUD Parameters + carga masiva por año
│   │   ├── calibracion/       # editor de velocity/efficiency por modo
│   │   ├── datasets/          # editor EstimationDatasetSource
│   │   ├── fuentes-vivas/     # editor LiveSourceRegistry + revisar snapshots
│   │   └── modelos-ml/        # editor MLModelRegistry + métricas
│   ├── como-funciona/page.tsx # tutorial guiado
│   ├── glossary/page.tsx      # IVA acreditable, capital de trabajo, bytecoding, etc.
│   ├── audit/page.tsx         # bitácora AuditLog
│   └── api/                   # 44 endpoints REST
├── components/
│   ├── ui/                    # 8 primitivos (button, card, input, label, select, table, textarea, badge)
│   ├── breadcrumbs.tsx        # navegación con prefijo "Inicio"
│   ├── info-tip.tsx           # popover ⓘ "¿de dónde sale este número?"
│   ├── mode-scenario-selector.tsx # combobox que actualiza ?mode=&scenario=
│   ├── recalcular-button.tsx  # llama a /recalculate-with-current-parameters
│   └── print-button.tsx       # window.print() con tracking
├── tests/engine.test.ts       # 26 tests unitarios del motor
├── e2e/                       # 16 tests Playwright (5 plan-pruebas + 11 simulación + screenshots)
├── 00..25_*.md                # spec original (no se borra; se refiere por número)
├── 17_seed_data_parametros_2026.json  # parámetros 2026 validados (DOF/INEGI/CONASAMI/SEFIN)
├── MANUAL.md                  # manual operativo + memoria fases A-H
└── HANDOFF_CHATGPT.md         # ESTE archivo
```

---

## 4. Modelo de datos — 25 modelos Prisma

**Núcleo (8 modelos del PDF §8 reconciliados Fase B):**
- `User` — 5 roles: admin, estimador, ayuntamiento, proveedor, auditor
- `Project` — añade `responsible`, `estimatedBudget`, `targetDate`, `notes` para alinearse al PDF
- `Module` — RF-03; complejidad/claridad/criticalidad 1-5, conteos, sensitiveData
- `UserStory` — RF-04; con maturityLevel, evidenceExpected, acceptanceCriteria
- `TeamProfile` — añade `productivityFactor`, `turnoverRisk`, `supervisionRequired` y `contractType` (asimilados/honorarios/nomina/resico_pf/freelance — clave para LFT)
- `Parameter` — RNF-06; year + key + effectiveFrom único, con sourceUrl
- `Estimate` — versionado (criterio 11+13: nunca sobrescribir), `parametersSnapshot` JSON, `inputsSnapshot` JSON
- `ChangeRequest` — tipos: correccion/garantia/ajuste_menor/mejora/nuevo_alcance
- `CashFlowLine` — mes a mes con ingresos, 4 egresos, neto, acumulado, capital requerido
- `AuditLog` — bitácora before/after (RNF-03)

**Addendum FASE D (datasets, ML, fuentes vivas, validación científica) — del [19_addendum...](19_addendum_base_datos_datasets_ml.md) y [21..25](21_addendum_pipeline_ml.md):**
- `DevModeCatalog` — catálogo de los 5 modos (con `bytecoding_prompts` y `low_code` separados de `bytecoding`)
- `ScenarioProductivityFactor` — factores per-fase × modo × escenario con `evidenceLevel`
- `EstimationDatasetSource` — D1-D7 (Public Jira, JOSSE, SEERA, etc.)
- `DatasetImportBatch` + `ExternalTaskRecord` — pipeline de ingesta
- `TrainingCase` — casos locales etiquetados (Fresnillo)
- `MLModelRegistry` + `MLModelMetric` + `MLPrediction` — modelos entrenados
- `LiveSourceRegistry` + `LiveSourceSnapshot` — auto-actualización de UMA, salario mínimo, etc.
- `FiscalParameterVersion` + `ParameterChangeReview` — versionado de Parameters con aprobación
- `ProjectActualResult` + `EstimationFeedback` — feedback loop estimado vs real

**Decisiones de portabilidad SQLite/Postgres:**
- IDs `cuid()` (no UUID nativo)
- Strings en lugar de enums (Postgres soporta enums; SQLite no)
- JSON serializado como `String` (no `Json` nativo)
- Timestamps como `DateTime` (no `TIMESTAMPTZ`)
- Decimal con precisión 18,4 (montos) / 18,6 (tasas)

---

## 5. Motor de cálculo — fórmulas REALES implementadas

### 5.1 Esfuerzo base (calibración 2026-05-02)

```ts
// Por módulo (mínimo 40h):
moduleScore = complexity * 50
            + screensCount * 16
            + reportsCount * 24
            + catalogsCount * 12
            + integrationsCount * 50
            + (sensitiveData ? 36 : 0)
            + (criticality - 1) * 12

// Total proyecto:
basePoints = Σ moduleScore
           + externalIntegrations * 80
           + (dataMigration ? 120 : 0)
           + totalReports * 12
           + (anySensitive ? 96 : 0)
```

**Calibración:** un sistema integral con 8 módulos medios + datos sensibles + integraciones rinde ~2,000-3,000 horas en modo tradicional (4 personas × 4-6 meses).

### 5.2 Factores

```ts
clarityFactor: 1→1.80 · 2→1.50 · 3→1.25 · 4→1.10 · 5→1.00
riskFactor   = min(2.0, 1 + changeProbability + clientUnavailability + turnoverRisk)
technicalEffort = basePoints × clarityFactor × riskFactor
```

### 5.3 Distribución por modo (suma con tolerancia)

JSON seed declara `_expected_sums` por modo. Bytecoding suma 1.10 intencionalmente (hardening adicional), tradicional suma 1.00, etc. El motor valida que `actualSum ≈ expectedSum` ± 0.001 o lanza error.

### 5.4 Calendario y prototipo (clave de la hipótesis)

```ts
weeksTotal       = totalEffortHours / (weeklyCapacityHours × velocity_factor)
weeksToPrototype = codingHours      / (weeklyCapacityHours × velocity_factor × prototype_speedup)
```

**Velocity 2026 calibrado por evidencia (McKinsey 46%, GitHub Copilot 55%, Anthropic 70-90%, Bain "unremarkable"):**

| Modo | velocity_factor | prototype_speedup | effort_efficiency |
|---|---|---|---|
| traditional | 1.00 | 1.00 | 1.00 |
| ai_assisted | 1.55 | 2.50 | 0.78 |
| hybrid | 1.90 | 3.50 | 0.72 |
| bytecoding_prompts | 3.00 | 7.00 | 0.65 |
| low_code | 3.50 | 8.00 | 0.50 |

**`effort_efficiency` (NUEVO en mayo 2026):** las horas-persona equivalentes se reducen porque cada modo automatiza tareas. Sin esto, bytecoding tenía MÁS horas que tradicional, lo cual es ilógico.

### 5.5 Costo (cambió varias veces — versión actual)

```ts
// Versión actual (mayo 2026): basado en calendario, no en horas
monthlyTeamCost  = Σ computeProfileCostDetailed(perfil, ratesIMSS_2026)
realMonthsOfMode = weeksTotal / 4.33
baseCost         = monthlyTeamCost × realMonthsOfMode × actualSum
totalCost        = baseCost + lftRisk.estimatedTerminationCost   // si aplica
subtotal         = totalCost / (1 - targetMargin)
total_invoice    = subtotal × (1 + IVA_GENERAL)
```

`computeProfileCostDetailed` desglosa por ramo IMSS:
- EyM (especie fija + excedente + dinero + pensionados)
- Riesgo de trabajo (clase I-V, default I para software)
- Invalidez y vida
- Guarderías
- Retiro
- CEAV escalonada por SBC en UMAs (8 tramos)
- INFONAVIT 5%
- ISN Zacatecas 3.5% + sobretasa UAZ 10% del ISN
- Provisiones LFT (aguinaldo + prima vacacional ≈ 0.124 mensual)

### 5.6 Riesgo LFT (NUEVO mayo 2026)

Si `realMonthsOfMode > 6` y hay personal con `contractType="nomina"`, aplica liquidación LFT:
```ts
indemnización_LFT = 90 días + 20 días/año + prima_antigüedad (12 días/año)
   sobre SBC del personal en nómina
```
Esto NO aplica a asimilados, honorarios, RESICO PF ni freelance. El riesgo se suma al `totalCost` para que el proveedor vea el costo real de elegir personal en nómina por más de 6 meses.

### 5.7 Cashflow

```ts
month_n.income = anticipo (mes 1) + finalPayment (mes N) + monthlyMilestones
month_n.outflow = payroll + taxes + tools + admin
month_n.netFlow = income - outflow
month_n.accumulated = previous.accumulated + month_n.netFlow
workingCapitalRequired = |min(accumulated, 0)|   ← peor saldo del proyecto
```

### 5.8 Riesgo agregado

`risk = technical + requirements + fiscal + cashFlow + change` → categoriza en bajo/medio/alto/crítico.

---

## 6. Parámetros 2026 sembrados (validados contra fuentes oficiales)

Almacenados en [17_seed_data_parametros_2026.json](17_seed_data_parametros_2026.json) y cargados a tabla `Parameter`. Cada parámetro lleva `source` + `source_url` + `effective_from` + `notes`.

| Clave | Valor | Fuente |
|---|---|---|
| `IVA_GENERAL` | 0.16 | LIVA Art. 1 (DOF 07-nov-2025) |
| `ISR_PERSONA_MORAL` | 0.30 | LISR Art. 9 |
| `UMA_DIARIA` | 117.31 MXN | INEGI Comunicado 1/26 (DOF 09-ene-2026, vigente 01-feb-2026) |
| `UMA_MENSUAL` | 3,566.22 MXN | mismo |
| `UMA_ANUAL` | 42,794.64 MXN | mismo |
| `SALARIO_MINIMO_GENERAL_DIARIO` | 315.04 MXN | CONASAMI (DOF 09-dic-2025) |
| `SALARIO_MINIMO_ZLFN_DIARIO` | 440.87 MXN | CONASAMI |
| `ISN_ZACATECAS` | 0.035 | Ley de Hacienda del Estado de Zacatecas 2026 (SEFIN) |
| `UAZ_SOBRETASA` | 0.10 | Ley de Hacienda Zacatecas (sobre ISN) |
| `EYM_*`, `IV_*`, `RT_*`, `RETIRO_*`, `CEAV_*`, `GUARDERIAS_*` | tasas IMSS por ramo | LSS Art. 25-106 |
| `INFONAVIT` | 0.05 | LINFONAVIT Art. 29 |
| `LFT_AGUINALDO_DIAS` | 15 | LFT Art. 87 |
| `LFT_VACACIONES_PRIMERA_ANUALIDAD` | 12 | LFT Art. 76 (reforma 2023) |
| `LFT_PRIMA_VACACIONAL` | 0.25 | LFT Art. 80 |
| `LFT_INDEMNIZACION_BASE_DIAS` | 90 | LFT Art. 50 |
| `LFT_INDEMNIZACION_DIAS_POR_ANIO` | 20 | LFT Art. 50 |
| `LFT_PRIMA_ANTIGUEDAD_DIAS_POR_ANIO` | 12 | LFT Art. 162 |
| `DEV_MODE_VELOCITY` (table) | ver §5.4 | calibrado mayo 2026 con evidencia |
| `DEV_MODE_FACTORS` (table) | coeficientes per-fase × modo | seed validado por motor |

---

## 7. API REST — 44 endpoints implementados

```
# Proyectos
GET    /api/projects                          # listar
POST   /api/projects                          # crear
GET    /api/projects/[id]                     # detalle
PUT    /api/projects/[id]                     # actualizar
DELETE /api/projects/[id]                     # eliminar
POST   /api/projects/[id]/estimate            # ejecutar estimación (3 escenarios × 1 modo)
GET    /api/projects/[id]/estimates           # listado
POST   /api/projects/[id]/recalculate-with-current-parameters
GET    /api/projects/[id]/modules             # CRUD nested
GET    /api/projects/[id]/team                # CRUD nested
GET    /api/projects/[id]/changes             # CRUD nested
POST   /api/projects/[id]/actual-result       # feedback (estimado vs real)

# Catálogo y subentidades
GET/PUT/DELETE /api/modules/[id]
GET/PUT/DELETE /api/stories/[id]
GET/PUT/DELETE /api/team/[id]
GET/PUT/DELETE /api/changes/[id]
GET/PUT/DELETE /api/estimates/[id]
POST           /api/estimates/[id]/feedback

# Parámetros y calibración
GET/POST       /api/parameters
PUT/DELETE     /api/parameters/[id]
POST           /api/parameters/cargar-anio    # carga masiva año siguiente
POST           /api/parameters/nuevo
GET            /api/parameter-reviews
POST           /api/parameter-reviews/[id]/approve | /reject
GET            /api/fiscal-parameters
GET/POST       /api/calibracion/velocity
GET            /api/dev-modes

# Datasets / ML / Fuentes vivas
GET/POST       /api/datasets
GET/PUT/DELETE /api/datasets/[id]
GET/POST       /api/datasets/[id]/imports
GET/POST       /api/training-cases
GET/POST       /api/ml-models
GET/PUT/DELETE /api/ml-models/[id]
POST           /api/ml-models/[id]/approve
GET/POST       /api/ml-models/[id]/metrics
GET/POST       /api/live-sources
GET/PUT/DELETE /api/live-sources/[id]
POST           /api/live-sources/[id]/check
GET            /api/live-sources/[id]/snapshots
```

Sin auth todavía. Para producción se planea NextAuth con los 5 roles.

---

## 8. UI implementada (páginas)

**Operador no-técnico:** Inicio · Mis proyectos · ¿Cómo funciona? · Glosario.
**Avanzado/Admin (en footer):** Editor de parámetros · Calibración · Datasets · Fuentes vivas · Modelos ML · Bitácora · Comparador técnico · Usuarios.

**Wizard de estimación:** 9 pasos del [08_flujos_ui.md](08_flujos_ui.md). Datos generales → contexto → módulos → historias → equipo → modo → fiscal-laboral → flujo → resultados.

**Project detail (mayo 2026):**
- Breadcrumbs siempre visibles
- Checklist de progreso 5 pasos con barra
- Selector `?mode=X&scenario=Y` (cambia precio cotizado y descripción sin recalcular)
- 4 tarjetas resumen con tooltips ⓘ explicativos
- Tarjeta naranja "Riesgo de cotización" cuando rango entre modos > 1.5×
- Tabla comparador 5 modos × 3 escenarios
- Listas: módulos, equipo, cambios pendientes
- Tabla de cashflow mes a mes

**Reportes:** 3 plantillas HTML imprimibles (`?print=1` activa CSS `@media print`):
- Para Ayuntamiento: alcance, tiempos, costos, riesgos, qué NO incluye, alertas de cotización baja
- Para Proveedor: costo real, capital de trabajo, impuestos, margen, precio mínimo
- Académico: variables, escenarios, evidencia para validar hipótesis

---

## 9. Demo cargado actualmente

`prisma/reset-demo-realista.ts` crea **un solo proyecto** realista:

> **Sistema integral de trámites — Fresnillo**
> Cliente: Ayuntamiento de Fresnillo (Dirección de Innovación)
> 8 módulos · 12 historias detalladas · 4 perfiles de equipo · 1 cambio pendiente
> Estimaciones precomputadas en los 5 modos × 3 escenarios

Resultados representativos del demo (precio cotizado al cliente):
- Tradicional conservador: $5,335,228 · 9.7 meses
- Tradicional optimista: $3,393,587
- Híbrido probable (default): $1,096,196
- Bytecoding optimista: $671,421
- Low-code probable: $411,172 · 2.8 meses

13× rango entre el modo más caro y el más barato → activa la alerta naranja "Riesgo de cotización".

---

## 10. Pendientes UX detectados (mayo 2026, post-uso)

**Investigación reciente (Konfío, BBVA México, LOPSRM, PMBOK 7) recomienda:**
1. Renombrar "Capital de trabajo" → **"Bache de caja máximo: lo que necesitas en banco para no quebrar antes del finiquito"** (lenguaje de empresario, no contador).
2. Adoptar etiquetas oficiales mexicanas en flujo: **Anticipo / Estimaciones (pagos parciales) / Finiquito** — son las que aceptan auditorías ASF/ORFIS y la Ley de Obras Públicas. Mostrar saldo del periodo + saldo acumulado en columnas separadas.
3. Cotizar `ChangeRequest` por fase del proyecto: factor 1.0 (inicio), 1.5 (mitad), 2.5 (avanzado/post-pruebas), con contingencia 10-15% explícita y mínimo configurable. Es la curva de costo del cambio del PMBOK / Boehm.

**Otros pendientes:**
- Tooltip del precio cotizado: explicar por qué híbrido+probable es el default y por qué SE PUEDE cambiar arriba.
- Cashflow: agregar columna **Concepto** ("Anticipo 35%", "Pago mensual", "Finiquito 35%") para que el operador entienda la pauta.
- Cashflow se calcula solo sobre híbrido+probable; idealmente respondería al selector de modo (requiere cashflow per-estimate, refactor moderado).
- Cuánto cuesta cada cambio individual (hoy se captura `costImpact` manual; debe sugerirse con la fórmula PMBOK).

---

## 11. Tests existentes

```
tests/engine.test.ts             — 26 tests unitarios (clarity, risk, modos, costos, cashflow, LFT)
e2e/plan-pruebas.spec.ts         — 5 casos del plan de pruebas (12_plan_pruebas.md)
e2e/simulacion-completa.spec.ts  — 11 tests de simulación end-to-end
e2e/calibracion.spec.ts          — verifica editor de velocity
e2e/admin-extra.spec.ts          — admin pages CRUD
e2e/screenshots*.spec.ts         — capturas para artículo
```

Comandos: `npm test` · `npm run e2e` · `npm run typecheck`.

---

## 12. Discrepancias resueltas vs spec original

1. **Project**: PDF §8 listaba `responsable, presupuesto estimado, fecha objetivo, notas`. La spec .md no los tenía. **Resuelto:** schema actual incluye los 4 campos.
2. **TeamProfile**: PDF tenía `costo_hora, factor_productividad`; .md tenía `turnoverRisk, supervisionRequired`. **Resuelto:** se conservan TODOS.
3. **Coeficientes de modo**: PDF y .md daban sumas distintas (bytecoding 0.95 .md vs 1.10 JSON). **Resuelto:** son fracciones que pueden sumar ≠1.0 intencionalmente; el motor valida `actualSum ≈ _expected_sums[mode]` y lanza error si no.
4. **Modos de desarrollo**: spec original mencionaba 4 (traditional/assisted/bytecoding/hybrid). **Resuelto:** se separó en 5 (`bytecoding_prompts` ≠ `low_code`) por hallazgo del addendum 22.
5. **Riesgo LFT**: la spec NO lo contemplaba. **Agregado mayo 2026** porque el operador lo solicitó (proyectos >6 meses con personal en nómina deben asumir indemnización LFT al cierre).

---

## 13. Lo que NO está implementado

(Coincide con lo declarado en PDF §3 que la primera versión NO incluiría):
- Nómina timbrada CFDI 4.0
- Declaraciones fiscales reales
- Integración SAT/IMSS/bancos
- Firma electrónica
- Gestión completa de contratos públicos
- Sustitución de asesoría legal/fiscal
- Modelo predictivo entrenado y aprobado (la infraestructura existe en BD; falta entrenar)
- NextAuth (sin autenticación todavía)

---

## 14. GitHub

Repo principal: `https://github.com/ROGELIOFLORESYUNTA/EMPS-Fresnillo`

Commits relevantes:
- `48bca49` — EMPS-Fresnillo v0.1.0 (sistema completo de estimación municipal)
- `c708807` — docs: agregar MANUAL.md (manual de operación + memoria del proyecto)
- (pendiente) — selector de modo+escenario + tooltips ⓘ + handoff doc

---

# PROMPT PARA CHATGPT PRO

> Copia y pega lo siguiente en una conversación nueva con ChatGPT Pro, junto con el archivo HANDOFF_CHATGPT.md adjunto.

```
Hola. Estamos retomando el proyecto EMPS-Fresnillo (estimador municipal de
proyectos de software para la UAZ). Cuando trabajamos la documentación inicial
contigo, propusiste un stack tentativo (React/Next.js + Express/FastAPI +
SQLite/PostgreSQL). Durante la implementación práctica, varias de esas
decisiones se cerraron de forma definitiva y otras evolucionaron por necesidad.

ANTES DE PROPONERME CUALQUIER CAMBIO O ARCHIVO NUEVO, lee con atención el
documento HANDOFF_CHATGPT.md adjunto. Es el snapshot técnico del estado real
del repositorio al 3 de mayo de 2026. Contiene:

  1. Stack final (Next.js 15 App Router + TS estricto + Prisma 6 + SQLite,
     no Express/FastAPI; Tailwind + shadcn-style + Radix; Vitest + Playwright).
  2. Las 25 tablas Prisma reales y por qué algunas decisiones cambiaron
     respecto al PDF/MD.
  3. Las fórmulas tal como están implementadas en lib/engine/* (incluyendo
     cambios mayo 2026: effort_efficiency por modo, riesgo LFT por contrato
     >6 meses, costo basado en calendario, no en horas).
  4. Los 38 parámetros 2026 ya validados contra fuentes oficiales (DOF,
     INEGI, CONASAMI, SEFIN Zacatecas, IMSS, INFONAVIT) con cita y URL.
  5. Los 44 endpoints REST existentes y las páginas UI implementadas.
  6. Discrepancias YA RESUELTAS entre el PDF original y la implementación.
  7. Pendientes UX detectados con investigación reciente (Konfío, BBVA México,
     LOPSRM, PMBOK 7) — útiles para próximas iteraciones.
  8. Tests existentes (26 unit + 16 E2E).

REGLAS DE TRABAJO PARA ESTA CONVERSACIÓN:

  A. Si te pido modificar la documentación de investigación (los archivos
     00..25_*.md y el PDF académico), tu trabajo es ALINEARLA con el snapshot
     real. No contradigas el código. Si algún .md original dice "Express",
     reemplázalo por "Next.js API Routes". Si dice "4 modos de desarrollo",
     ajusta a 5. Si dice "una sola tabla Estimate sin versión", ajusta a
     "versionado con parametersSnapshot".

  B. Si te pido un nuevo entregable (capítulo del artículo, anexo, defensa
     metodológica), basa todo en lo del snapshot. Cita parámetros con su
     fuente oficial 2026 (las URL están en el JSON seed listado en §6).

  C. Si te pido proponer mejoras técnicas, considera primero los 4 pendientes
     de §10 ANTES de inventar nuevos. La instrucción del autor original ha
     sido "simple no significa quitar cosas importantes" y "lenguaje de
     empresario, no de contador" para el operador final.

  D. Cuando dudes entre lo que dice el PDF original y lo que dice el
     snapshot, GANA SIEMPRE EL SNAPSHOT. El código es la fuente de verdad.
     El PDF se actualizará para coincidir.

  E. Idioma: español neutro. Sin frases de marketing. Sin "te guiamos paso
     a paso" / "ya está todo listo" / saludos comerciales. Tono académico
     o técnico según el entregable.

  F. Cuando referencies un archivo del repo, usa la ruta exacta y, si aplica,
     el número de línea (formato: `lib/engine/effort.ts:53`).

Empecemos. Confirma que leíste el handoff y dime qué entregable necesitamos
primero (¿actualizar el PDF académico? ¿redactar el artículo? ¿anexo
metodológico? ¿plan de validación contra dataset SEERA?).
```

---

**Fin del handoff.** Si ChatGPT pregunta por algo que no esté en este documento, la fuente de verdad es el código en el repo, en este orden de prioridad:

1. `prisma/schema.prisma` — modelo de datos
2. `lib/engine/*.ts` — fórmulas y motor
3. `17_seed_data_parametros_2026.json` — parámetros y sus fuentes
4. `app/api/**/route.ts` — contratos REST
5. `app/**/page.tsx` — UI y flujos
6. `MANUAL.md` — guía operativa y memoria de fases
7. `00..25_*.md` — spec original (referencia histórica; puede estar desfasada)
