# Manual de operación — EMPS-Fresnillo

> **Estimador Municipal de Proyectos de Software** con viabilidad técnica, fiscal-laboral, flujo de efectivo y comparación de 5 modos de desarrollo.
> Universidad Autónoma de Zacatecas · Ingeniería en Software · 2026.

---

## 1. Para qué sirve este sistema

En proyectos de software municipales, una cotización puede verse económica al inicio y terminar **costando varias veces más** durante la ejecución porque no se estimaron:

- Cambios de alcance solicitados por el área usuaria
- Mantenimiento posterior
- Nómina real (sueldos + IMSS + INFONAVIT + ISN + prestaciones LFT)
- Flujo de efectivo (el proveedor debe poder pagar antes de cobrar)
- Conversión a contrato indeterminado por exceder 6 meses (LFT)
- Diferencias reales entre modos de desarrollo (manual vs IA vs bytecoding vs low-code)

El sistema resuelve esto unificando las cuatro dimensiones en una sola estimación temprana.

---

## 2. Cómo arrancar el sistema (operador)

### 2.1 Instalación local rápida

```bash
git clone https://github.com/ROGELIOFLORESYUNTA/EMPS-Fresnillo.git
cd EMPS-Fresnillo
docker compose up         # listo en ~60 seg en http://localhost:3000
```

### 2.2 Instalación de desarrollo

```bash
npm install
npm run setup             # instala + crea DB SQLite + siembra parámetros 2026
npm run dev               # dev server en http://localhost:3000
```

Comandos útiles:

| Comando | Para qué |
|---|---|
| `npm run dev` | Levanta el sistema en modo desarrollo |
| `npm run test` | Corre los 26 tests del motor |
| `npm run e2e` | Tests end-to-end con Playwright |
| `npm run db:studio` | Interfaz visual de la base de datos (Prisma Studio) |
| `npm run db:reset` | Borra la DB y siembra desde cero |
| `npm run screenshots` | Genera capturas automáticas en `docs/screenshots/` |
| `npm run typecheck` | Valida TypeScript |

---

## 3. Flujo del usuario (6 pasos)

### Paso 1 — Crear proyecto
**Pantalla:** `/projects/new`

Captura los datos generales:
- Nombre del proyecto
- Cliente (Ayuntamiento)
- Área usuaria
- Tipo de sistema (CRUD interno, portal ciudadano, integrador, trámites, etc.)
- Objetivo administrativo
- Prioridad

### Paso 2 — Capturar módulos
**Pantalla:** `/projects/[id]/modules`

Por cada módulo del sistema:
- Nombre y tipo
- **Complejidad (1-5):** qué tan compleja es la lógica
- **Claridad (1-5):** qué tan bien definido está el requerimiento (1=incompleto, 5=listo para estimar)
- **Criticidad (1-5):** qué tan crítico es el módulo para el cliente
- Pantallas, reportes, catálogos, integraciones
- Si maneja **datos sensibles** (LFPDPPP)

### Paso 3 — Definir equipo
**Pantalla:** `/projects/[id]/team`

Por cada perfil:
- Rol (líder, dev senior, dev junior, analista, tester, etc.)
- Nivel (junior/mid/senior/lead)
- Salario mensual
- Disponibilidad (%)
- Meses asignados
- Tipo de contrato (**nómina**, asimilados, honorarios, RESICO, freelance) — esto afecta el riesgo LFT

### Paso 4 — Calcular estimación
**Pantalla:** `/projects/[id]/estimate`

- Margen objetivo en % (default 20%)
- Capacidad del equipo en horas/semana
- Modo de cálculo de costo: **Detallado** (IMSS por ramo, INFONAVIT por separado) o **Estimado** (factor 40% sobre salario)
- Calendario de pagos: anticipo % + entregables % (auto) + pago final %
- Capital declarado por el proveedor

Por default ejecuta los **5 modos × 3 escenarios = 15 estimaciones**.

### Paso 5 — Revisar resultados
**Pantalla:** `/projects/[id]`

Tarjetas principales:
- **Precio cotizado al cliente** (asume modo híbrido probable)
- **Dinero que necesita el proveedor al inicio** (capital de trabajo = peor saldo negativo)
- **⚠ Riesgo de cotización** (rango entre modo más barato y más caro — alerta el escenario de "cotizar quebrado")
- **Cambios solicitados** pendientes de decisión

Tabla del comparador con los 15 escenarios completos.

### Paso 6 — Generar reportes
**Pantalla:** `/projects/[id]/reports`

Tres reportes según la audiencia:
- **Ayuntamiento** — alcance, riesgos, qué NO está incluido, checklist de aceptación
- **Proveedor** — costo equipo, capital de trabajo, IVA/ISR, margen, recomendación de pago
- **Académico** — variables capturadas, 15 escenarios comparados, métricas de validación

Cada reporte se imprime/exporta a PDF con un click.

---

## 4. Cómo se mantiene (administrador)

### 4.1 Editar parámetros fiscales o laborales
**Pantalla:** `/admin/parametros`

- 38 parámetros agrupados por categoría (UMA, IVA, ISR, IMSS, INFONAVIT, ISN Zacatecas, prestaciones LFT, modos de desarrollo)
- Cada parámetro tiene: valor, vigencia desde/hasta, fundamento legal, URL oficial, notas
- **Editar un parámetro:** click en el icono de lápiz → cambiar valor → "Guardar cambios"
- **Marcar como vencido:** botón rojo (soft delete, no destruye historial)
- **Crear parámetro nuevo:** botón "Nuevo parámetro" arriba

> ⚠ **Importante:** Modificar un parámetro NO altera estimaciones existentes (cada estimación guarda snapshot de los parámetros usados — RNF-03 auditabilidad). Para que un proyecto use valores nuevos, abrir el proyecto y presionar **"Recalcular con parámetros vigentes"** (genera nueva versión sin borrar la anterior).

### 4.2 Calibrar el motor de cálculo
**Pantalla:** `/admin/calibracion`

Para cada uno de los 5 modos de desarrollo, ajustar:
- **Velocidad calendario** (×) — qué tan rápido entrega el modo respecto a tradicional
- **Aceleración a prototipo** (×) — qué tan rápido se llega a prototipo funcional
- **Sobrecosto endurecimiento** (%) — trabajo extra de revisión/seguridad
- **Eficiencia de horas** (×) — la IA reduce horas-persona, no solo calendario
- **Calidad del prototipo** (solo bytecoding) — cuánto del producto final entrega el prototipo crudo

Botón **"Valores predeterminados"** restaura la calibración basada en evidencia 2026 (McKinsey, GitHub, Anthropic, Bain).

### 4.3 Cargar parámetros del año siguiente
**Pantalla:** `/admin/parametros/cargar-anio`

Subir un JSON con la estructura de `17_seed_data_parametros_2026.json` para 2027 u otro año. El sistema crea los nuevos y actualiza los existentes (idempotente).

### 4.4 Datasets de investigación
**Pantalla:** `/admin/datasets`

CRUD completo de los datasets registrados (Public Jira, JOSSE, SEERA, contratación pública, casos locales). Permite registrar importaciones con fecha, archivo y conteo de registros.

### 4.5 Fuentes vivas
**Pantalla:** `/admin/fuentes-vivas`

8 fuentes oficiales (SAT, INEGI, CONASAMI, SEFIN Zacatecas, Zenodo, datos.gob.mx) registradas con su URL, frecuencia de revisión y tipo de parser. Botón "Revisar fuente ahora" registra un snapshot manual; si detecta cambio, crea un `ParameterChangeReview` que un admin aprueba/rechaza desde la misma pantalla.

### 4.6 Modelos ML
**Pantalla:** `/admin/modelos-ml`

Registro de los 4 modelos planeados (effort_range, change_risk, cost_deviation, mode_factor). CRUD completo con métricas (MAE, RMSE, MAPE, etc.) y aprobación humana antes de uso.

### 4.7 Bitácora del sistema
**Pantalla:** `/audit`

Cada acción importante (crear/editar/eliminar/aprobar) queda registrada con: fecha, usuario, entidad afectada, snapshot before/after, contexto.

### 4.8 Usuarios y roles
**Pantalla:** `/users`

5 roles documentados: Administrador, Estimador, Consulta Ayuntamiento, Proveedor, Auditor académico.

---

## 5. Conceptos clave

| Término | Significado |
|---|---|
| **UMA 2026** | $117.31 diarios. Base para multas, IMSS, INFONAVIT. Distinto del salario mínimo. |
| **ISN Zacatecas** | 3.5% sobre nómina + 10% adicional para UAZ. Carga combinada efectiva: 3.85%. |
| **SBC** | Salario Base de Cotización IMSS. Salario diario más prestaciones (aguinaldo proporcional, prima vacacional). Tope: 25 UMAs. |
| **Capital de trabajo** | Peor saldo acumulado negativo del flujo de efectivo. Es lo que el proveedor debe tener antes de empezar para no quebrarse mientras cobra entregables intermedios. |
| **Bytecoding** | Generación de código mediante instrucciones en lenguaje natural a una IA. Prototipo 7-10× más rápido pero requiere hardening posterior (revisión, seguridad, refactor). |
| **3 escenarios** | Optimista (×0.85), Probable (×1.00), Conservador (×1.25 a ×1.80 según incertidumbre acumulada). |
| **Riesgo LFT** | Si el proyecto excede 6 meses con personal en nómina, hay riesgo de que el contrato por obra/tiempo determinado se convierta a indeterminado. Si despides al cierre debes pagar liquidación (90 días + 20 días/año + prima antigüedad). |
| **Riesgo de cotización** | Diferencia entre el modo más barato y el más caro. Si cotizas asumiendo bytecoding pero ejecutas tradicional, el proyecto puede cuesta varias veces más. |

Glosario completo en `/glossary` (30 términos).

---

## 6. Estructura técnica del repo

```
EMPS-Fresnillo/
├─ app/                      # Next.js App Router
│  ├─ api/                   # 25+ endpoints REST
│  ├─ admin/                 # Pantallas administrativas
│  │  ├─ parametros/         # CRUD parámetros + carga año + edición
│  │  ├─ calibracion/        # Sliders de los 5 modos
│  │  ├─ datasets/           # CRUD datasets registrados
│  │  ├─ fuentes-vivas/      # CRUD fuentes oficiales + reviews
│  │  └─ modelos-ml/         # Registro ML + métricas + aprobación
│  ├─ projects/              # Wizard, módulos, equipo, estimar, reportes
│  └─ [otras]                # comparator, glossary, audit, users, como-funciona
├─ lib/
│  ├─ engine/                # Motor puro (sin I/O)
│  │  ├─ effort.ts           # Esfuerzo, claridad, riesgo, distribución por fase, escenarios
│  │  ├─ cost.ts             # Costo perfil (IMSS detallado o factor estimado), precio, ISR
│  │  ├─ cashflow.ts         # Flujo + capital de trabajo
│  │  ├─ risk.ts             # Score agregado 5 dimensiones
│  │  ├─ lft-risk.ts         # Riesgo LFT (conversión a indeterminado + liquidación)
│  │  ├─ metrics.ts          # 6 métricas validación científica
│  │  └─ types.ts            # Tipos compartidos
│  ├─ db.ts                  # Prisma singleton
│  ├─ parameters.ts          # Carga de parámetros desde DB
│  ├─ estimate-service.ts    # Orquesta motor + persistencia + auditoría + LFT
│  └─ validators.ts          # Schemas Zod
├─ components/
│  ├─ ui/                    # Componentes shadcn-style
│  └─ breadcrumbs.tsx        # Migas de pan reutilizables
├─ prisma/
│  ├─ schema.prisma          # 24 modelos (9 originales + 15 addendum)
│  ├─ seed.ts                # Siembra inicial
│  └─ reset-demo-realista.ts # Borrar todo y crear demo realista
├─ tests/
│  └─ engine.test.ts         # 26 tests del motor
├─ e2e/
│  ├─ plan-pruebas.spec.ts   # 5 casos del plan_pruebas.md
│  ├─ simulacion-completa.spec.ts # Flujo end-to-end real
│  └─ screenshots.spec.ts    # Capturas automáticas
├─ docs/
│  └─ screenshots/           # 27+ PNGs para artículo
├─ Dockerfile
├─ docker-compose.yml        # Soporta SQLite (default) + perfil postgres
└─ 17_seed_data_parametros_2026.json  # Fuente de verdad de parámetros
```

---

## 7. Memoria del proyecto — decisiones clave

### Fase A — Validación de parámetros 2026 (research-driven)
- 38 parámetros validados contra fuentes oficiales: DOF, INEGI, CONASAMI, SEFIN Zacatecas, LIVA, LISR, LSS, LFT, Ley INFONAVIT
- IVA 16%, ISR PM 30%, UMA $117.31 (vigencia 1-feb-2026), salarios mínimos generales y ZLFN, ISN Zacatecas 3.5% + UAZ 10%, 18 cuotas IMSS por ramo, INFONAVIT 5%, prestaciones LFT (Vacaciones Dignas 2023, prima vacacional, aguinaldo, PTU con tope reforma 2021)

### Fase B — Reconciliaciones documentales
- Project: agregados `responsible`, `estimated_budget`, `target_date`, `notes` que faltaban
- TeamProfile: unificados campos PDF (`hourly_cost`, `productivity_factor`) y .md (`turnover_risk`, `supervision_required`)
- Coeficientes de modo: aclarado que bytecoding suma 1.10 intencionalmente (hardening adicional)

### Fase C — Construcción del prototipo
- Stack: Next.js 15 + Prisma 6 + SQLite + Tailwind + Vitest
- 9 entidades en schema (Project, Module, UserStory, TeamProfile, Parameter, Estimate, ChangeRequest, CashFlowLine, AuditLog, User)
- Motor en TypeScript puro con 26 tests unitarios
- 25+ endpoints REST con validación Zod
- 19 páginas UI

### Fase D — Addendum integrado
- 12 archivos de documentación científica del addendum
- 5° modo de desarrollo agregado: `low_code`
- 15 tablas adicionales (datasets públicos, ML, fuentes vivas, parameter reviews, resultados reales)
- 11 endpoints administrativos nuevos
- Módulo `lib/engine/metrics.ts` con 6 métricas de validación científica

### Fase E — Refactor de UX/UI/CRUD
- Diseño visual: fondo gris-azul suave (210 30% 97%), no blanco puro
- Header sticky con backdrop-blur
- Layout centrado max-w-6xl
- Localización 100% al español
- Editor de parámetros con CRUD completo
- Editor visual de calibración del motor con sliders por modo
- CRUD inline en módulos, equipo, cambios, historias
- Dashboard simplificado con 3 acciones grandes
- Breadcrumbs en todas las pantallas (módulo `components/breadcrumbs.tsx`)

### Fase F — Calibración basada en evidencia
- Investigación en foros (Hacker News, Reddit, Medium, Red Hat) sobre productividad real de bytecoding/IA
- Calibración con datos de McKinsey Feb 2026 (46% reducción), GitHub Copilot survey (55% más rápido), Anthropic dic-2025 (70-90% código generado), Bain sept-2025 ("unremarkable" en empresas tradicionales), AIMultiple research
- Agregado `effort_efficiency` por modo: tradicional 1.0, asistido 0.78, hybrid 0.72, bytecoding 0.65, low-code 0.50
- Constantes de `computeBasePoints` recalibradas: ahora un sistema integral municipal de 8 módulos rinde ~6700h tradicional (≈ 9.7 meses con 4 personas)

### Fase G — Riesgo LFT
- Módulo `lib/engine/lft-risk.ts` que detecta proyectos >6 meses con personal en nómina
- Cálculo automático de liquidación: 90 días constitucionales + 20 días/año + prima antigüedad 12 días/año + aguinaldo + vacaciones proporcionales
- Se suma al costo total cuando aplica
- En el proyecto demo, tradicional dura 9.7 meses → liquidación ~$1M se suma; bytecoding 3.7 meses → no aplica

### Fase H — Comunicación clara al operador
- Tarjetas con etiquetas en español neutro (no jerga técnica)
- Tarjeta "⚠ Riesgo de cotización" con alerta naranja cuando rango entre modos > 1.5×
- Mensaje explícito: "Si cotizas $X (modo barato) pero ejecutas en modo Y, cuesta $Z"
- Subtítulos contextuales en cada tarjeta explicando de qué modo y escenario viene el número
- Tabla de flujo de efectivo con encabezado que aclara modo y escenario, descripción que explica qué es el capital de trabajo

---

## 8. Casos de prueba ejecutados

### Tests unitarios del motor (26)
Cubren cálculo de claridad, esfuerzo, distribución por modo, escenarios, calendario, costo perfil (detallado y estimado), precio, ISR, flujo de efectivo, capital de trabajo, riesgo agregado, métricas científicas, normalización de modos.

### Tests E2E del plan de pruebas (5 casos)
1. Proyecto simple — bytecoding reduce semanas a prototipo
2. Proyecto municipal medio — híbrido tiene riesgo medio o menor
3. Integración compleja — bytecoding NO ahorra agresivamente, riesgo alto
4. Proveedor sin anticipo — capital de trabajo alto, alerta financiera
5. Cambio de alcance — se registra y queda visible

### Tests E2E de simulación completa (11 acciones)
Crear proyecto → capturar 5 módulos → 4 perfiles equipo → estimar 5 modos → ver 3 reportes → editar parámetro fiscal → calibración → registrar cambio + aceptarlo → recalcular con parámetros vigentes → bitácora → cleanup.

---

## 9. Hipótesis del estudio

> *La estimación temprana de proyectos de software municipales mejora cuando se integran, en una misma base de datos y un mismo cálculo, variables de requerimientos, cambios, modo de desarrollo, equipo, obligaciones fiscales-laborales, flujo de efectivo y mantenimiento.*

Bajo esta hipótesis, un sistema que compare escenarios tradicional, asistido por IA, bytecoding, low-code e híbrido **debería detectar riesgos que una cotización basada solo en horas no muestra**. Particularmente:

- Capital de trabajo requerido — el proveedor debe poder pagar antes de cobrar
- Sobrecostos por hardening en bytecoding — código rápido no es código maduro
- Dependencias por licenciamiento en low-code — vendor lock-in
- Riesgo de conversión LFT a indeterminado en proyectos >6 meses
- Diferencias entre modos de desarrollo (factor 5×-10× en proyectos integrales)

Los datos del demo "Sistema integral de trámites Fresnillo" demuestran las 5 señales:
- Tradicional: 42 sem, $3.88M (incluye liquidación LFT)
- Bytecoding: 10.5 sem, $790K (sin LFT, 4.9× más barato)
- **Si el proveedor cotiza $790K asumiendo bytecoding pero ejecuta tradicional: pierde $3.09M**

---

## 10. Pendientes y trabajo futuro

Los siguientes temas están identificados pero no implementados:

1. **Selector de modo+escenario** en panel de proyecto (en lugar del híbrido fijo)
2. **Tooltips con fuente** legal/empírica en cada número crítico
3. **Auto-actualización web** de parámetros fiscales (cron + scraping de fuentes oficiales)
4. **Capturas para artículo** académico — script de Playwright con casos hipotéticos preparados
5. **Autenticación real** de usuarios (actualmente los 5 roles están sembrados pero sin login)
6. **Migración a PostgreSQL** para producción (la arquitectura ya soporta el cambio vía `DATABASE_URL`)

---

## 11. Licencia y créditos

Uso académico-investigación. Universidad Autónoma de Zacatecas, 2026.

Las estimaciones generadas son preliminares. La determinación oficial fiscal y laboral requiere revisión profesional contable, fiscal y legal.

**Autor:** Rogelio Flores Rodríguez · Ingeniería en Software · UAZ

**Repositorio:** https://github.com/ROGELIOFLORESYUNTA/EMPS-Fresnillo
