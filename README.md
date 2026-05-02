# EMPS-Fresnillo

> **Estimador Municipal de Proyectos de Software** con viabilidad técnica, fiscal-laboral, flujo de efectivo, bytecoding/asistencia generativa y control de cambios — para municipios mexicanos. Caso piloto: Fresnillo, Zacatecas.
>
> Universidad Autónoma de Zacatecas · Ingeniería en Software · Seminario de Investigación · 2026.

[![Tests](https://img.shields.io/badge/tests-26%2F26%20passing-brightgreen)]() [![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)]() [![Next.js](https://img.shields.io/badge/Next.js-15-black)]() [![Prisma](https://img.shields.io/badge/Prisma-6-blueviolet)]() [![License](https://img.shields.io/badge/License-academic--research-lightgrey)]()

---

## Inicio rápido (3 formas)

### Opción A — Docker (recomendada para revisores)

```bash
git clone <este-repo>
cd EstimacionTemprana
docker compose up
```

Espera ~60 segundos al primer arranque (build + seed). Luego abre **http://localhost:3000** y ya verás:
- Dashboard con KPIs
- Proyecto demo con 3 módulos y 2 perfiles de equipo
- 38 parámetros fiscales 2026 sembrados (UMA, IVA, ISR, IMSS, INFONAVIT, ISN Zacatecas, prestaciones LFT, etc.)
- 7 datasets registrados (Public Jira, JOSSE, SEERA…)
- 8 fuentes vivas (SAT, INEGI, CONASAMI, SEFIN Zacatecas, Zenodo)
- 5 modos de desarrollo con coeficientes y velocidad calendario

### Opción B — Local con Node.js (desarrollo)

Requiere Node 20+ y npm 10+.

```bash
npm install
npm run setup    # crea SQLite, aplica schema y siembra datos
npm run dev      # http://localhost:3000
npm run test     # 26/26 tests del motor
```

### Opción C — Local + PostgreSQL (cercano a producción)

```bash
docker compose --profile postgres up
# emps en http://localhost:3001 con Postgres en localhost:5432
```

---

## Qué resuelve

En proyectos municipales una cotización puede verse económica pero **fallar durante la ejecución** porque no se estimaron cambios de alcance, mantenimiento, nómina, impuestos, flujo de efectivo, rotación de personal ni el modo real de desarrollo. EMPS-Fresnillo unifica **cuatro capas** en una sola estimación temprana:

1. **Técnica:** módulos, requerimientos, datos, integraciones, seguridad, pruebas, despliegue.
2. **Modo de desarrollo:** tradicional · asistido por IA · bytecoding/prompts · low-code · híbrido.
3. **Cambios y mantenimiento:** corrección · garantía · ajuste menor · mejora · nuevo alcance.
4. **Fiscal-laboral-financiera:** nómina, prestaciones, IMSS, INFONAVIT, ISN, IVA, ISR, flujo, capital de trabajo.

> **Regla rectora:** *El sistema no debe calcular solamente horas. Debe responder si el proyecto es viable técnica y financieramente.*

---

## Stack técnico

- **Frontend / Backend:** Next.js 15 (App Router) + TypeScript estricto + Tailwind 3 + shadcn-style UI
- **DB:** SQLite (local) → PostgreSQL (producción) vía Prisma 6
- **Tests:** Vitest 2 (motor de fórmulas)
- **Reportes:** HTML → PDF (botón imprimir nativo del navegador)
- **Validación:** Zod en cada endpoint
- **Auditoría:** AuditLog (RNF-03), parameters_snapshot por estimación, versionado sin sobreescritura

---

## Documentación de investigación

La carpeta contiene 31 documentos. **Empezar por:**

| Orden | Archivo | Para qué |
|---|---|---|
| 1 | [00_contexto_investigacion.md](00_contexto_investigacion.md) | Problema, hipótesis y enfoque |
| 2 | [01_modelo_integrado.md](01_modelo_integrado.md) | Cadena causal y salidas esperadas |
| 3 | [03_parametros_fiscales_laborales_2026.md](03_parametros_fiscales_laborales_2026.md) | Parámetros 2026 con citas oficiales |
| 4 | [06_modelo_datos.md](06_modelo_datos.md) | 9 entidades + 15 del addendum |
| 5 | [07_motor_formulas.md](07_motor_formulas.md) | Fórmulas de esfuerzo, costo, flujo y riesgo |
| 6 | [22_addendum_bytecoding_comparacion.md](22_addendum_bytecoding_comparacion.md) | Comparación de los 5 modos |
| 7 | [24_addendum_texto_metodologia_articulo.md](24_addendum_texto_metodologia_articulo.md) | Texto académico para el artículo |
| 8 | [25_addendum_validacion_cientifica.md](25_addendum_validacion_cientifica.md) | Métricas de validación |

PDF de referencia: [srs_sds_estimador_municipal_fresnillo_v4_integral_apa.pdf](srs_sds_estimador_municipal_fresnillo_v4_integral_apa.pdf).

---

## Estructura del repositorio

```
EstimacionTemprana/
├─ app/                       # Next.js App Router
│  ├─ api/                    # 25+ endpoints REST
│  ├─ projects/               # Wizard, módulos, equipo, estimar, reportes
│  ├─ datasets/               # Datasets registrados (D1-D7)
│  ├─ live-sources/           # Fuentes vivas + parameter-reviews
│  ├─ ml-models/              # Registro y métricas de modelos ML
│  ├─ comparator/             # Comparador de los 5 modos
│  ├─ parameters/             # 38 parámetros fiscales/laborales 2026
│  ├─ glossary/               # 30+ términos técnicos
│  ├─ audit/                  # Bitácora de cambios (RNF-03)
│  └─ users/                  # 5 roles documentados
├─ lib/
│  ├─ engine/                 # Motor puro (sin I/O) - 6 módulos
│  │  ├─ effort.ts            # Esfuerzo, claridad, riesgo, distribución, escenarios, calendario
│  │  ├─ cost.ts              # Costo perfil (detallado IMSS / factor estimado), precio, ISR
│  │  ├─ cashflow.ts          # Flujo + capital de trabajo
│  │  ├─ risk.ts              # Score agregado 5 dimensiones
│  │  ├─ metrics.ts           # 6 métricas de validación científica (addendum 25)
│  │  └─ types.ts             # Tipos compartidos
│  ├─ db.ts                   # Prisma singleton
│  ├─ parameters.ts           # Carga de parámetros desde DB
│  ├─ estimate-service.ts     # Orquesta motor + persistencia + auditoría
│  └─ validators.ts           # Schemas Zod
├─ components/ui/             # Componentes shadcn-style (Button, Card, Table, ...)
├─ prisma/
│  ├─ schema.prisma           # 24 modelos (9 originales + 15 addendum)
│  ├─ seed.ts                 # 38 params + 5 modos + 7 datasets + 8 fuentes vivas + 5 usuarios
│  └─ dev.db                  # SQLite (no commiteado)
├─ tests/
│  └─ engine.test.ts          # 26 tests del motor (cubre los 5 casos del plan + métricas)
├─ docker/
│  └─ entrypoint.sh           # Setup automático (db push + seed) al primer arranque
├─ Dockerfile                 # Multi-stage Next.js standalone
├─ docker-compose.yml         # Modo SQLite (default) + perfil postgres
└─ 17_seed_data_parametros_2026.json   # Fuente de verdad de parámetros fiscales
```

---

## Comandos útiles

```bash
# Desarrollo
npm run dev          # http://localhost:3000
npm run test         # 26 tests
npm run typecheck    # TypeScript strict
npm run lint         # ESLint Next.js

# Base de datos
npm run db:studio    # GUI Prisma para ver/editar la DB
npm run db:seed      # re-sembrar parámetros (idempotente)
npm run db:reset     # ⚠ borra todo y re-siembra
npm run db:push      # aplicar cambios del schema sin migration

# Setup completo (instalar + db + seed)
npm run setup
```

---

## Para revisores académicos

Si **no puedes correr el código**, tienes 3 niveles de evidencia:

1. **Documentación:** los 31 archivos `.md` y el PDF describen el modelo, las fórmulas y la metodología.
2. **Código:** el motor de fórmulas está en `lib/engine/` con 26 tests verdes que evidencian los cálculos.
3. **Capturas de pantalla:** se pueden generar con `npm run screenshots` (Playwright) — *pendiente de habilitar*.

Si **puedes correr Docker:** `docker compose up` y abre http://localhost:3000. Todo lo crítico está sembrado.

### ¿Qué cambió respecto a la versión académica original?

- **Fase A (research-driven):** se validaron los parámetros fiscales 2026 contra fuentes oficiales (DOF, INEGI, CONASAMI, SEFIN Zacatecas) y se agregaron 18 cuotas IMSS, INFONAVIT, prestaciones LFT (vacaciones reformadas 2023, prima vacacional, aguinaldo, PTU con tope 2021).
- **Fase B:** se reconciliaron 3 inconsistencias entre el PDF del SRS y los `.md`, y se aclaró la semántica de los coeficientes de modo de desarrollo (suma esperada 1.0 excepto bytecoding=1.10 intencional).
- **Fase D (addendum):** se integró el paquete addendum de base de datos + ML + datasets + fuentes vivas (12 archivos), agregando 15 tablas nuevas y un 5° modo de desarrollo (`low_code`).

---

## Hipótesis del estudio

> *La estimación temprana de proyectos de software municipales mejora cuando se integran, en una misma base de datos y un mismo cálculo, variables de requerimientos, cambios, modo de desarrollo, equipo, obligaciones fiscales-laborales, flujo de efectivo y mantenimiento.*

Bajo esta hipótesis, un sistema que compare escenarios tradicional, asistido por IA, bytecoding, low-code e híbrido **debería detectar riesgos que una cotización basada solo en horas no muestra** (especialmente capital de trabajo requerido, sobrecostos por hardening en bytecoding, y dependencias por licenciamiento en low-code).

Ver [25_addendum_validacion_cientifica.md](25_addendum_validacion_cientifica.md) para el diseño de comparación y métricas.

---

## Licencia

Uso académico-investigación. Universidad Autónoma de Zacatecas, 2026. La determinación oficial fiscal/laboral requiere revisión profesional contable, fiscal y legal.

## Contacto

Rogelio Flores Rodríguez · Universidad Autónoma de Zacatecas · Ingeniería en Software.
