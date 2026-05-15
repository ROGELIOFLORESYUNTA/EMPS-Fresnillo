# SESSION_STATE — EMPS-Fresnillo

**Última actualización:** 2026-05-03
**Commit más reciente:** `91ff732` (en `main`, ya pusheado a `ROGELIOFLORESYUNTA/EMPS-Fresnillo`)
**Propósito:** snapshot para retomar la conversación si el chat se cae. Captura qué quedó funcionando, qué se validó y qué falta. Complementa [MANUAL.md](MANUAL.md) (manual operativo) y [HANDOFF_CHATGPT.md](HANDOFF_CHATGPT.md) (handoff a ChatGPT Pro).

---

## 1. Estado de salud del repo (validado al cierre)

| Verificación | Resultado |
|---|---|
| `npm run typecheck` | ✅ exit 0 |
| `npm test` | ✅ **39/39 verde** (30 motor + 9 change-impact v6) |
| `npm run build` | ✅ compiled successfully (después de fix `module` reservado de Next.js) |
| Fórmulas vs `07_motor_formulas.md` | ✅ match completo (ver §3 abajo) |
| Endpoints v6 `POST /impact` + `POST /decision` | ✅ smoke test contra demo OK |
| Schema Prisma sincronizado con `dev.db` | ✅ `db:push` OK |

---

## 2. Hitos recientes (en orden cronológico)

**Mayo 3 (esta sesión):**
1. `feat(ux): selector modo/escenario, tooltips y rediseño UX` (commit `d167ae1`)
2. `fix(ux): claridad en proyecto detail — perspectiva, bache, riesgo y cashflow` (commit `e7d47d0`)
3. `feat(cambios): integrar Addendum v6 — control inteligente de cambios` (commit `91ff732`)

**Lo que cambió en UI:**
- Banner azul de perspectiva: "Estás viendo este proyecto como Proveedor de software"
- Selector mode/scenario que reescribe URL searchParams sin recalcular
- 4 tarjetas resumen con tooltips ⓘ (posicionados con `position: fixed`, no se empalman)
- "Capital de trabajo" → **"Bache de caja máximo"** (Konfío/BBVA México)
- "Finiquito" en celda → **"↓ Pago final (cobro)"** + flecha verde y `+MXN` prefix (evita confusión con liquidación al trabajador)
- "Estimación parcial" → **"↓ Pago parcial (cobro)"** + tooltip explicando LOPSRM Art. 54
- Tabla cashflow con columna **Concepto** que detecta automáticamente Anticipo/Pago parcial/Pago final
- Fila del bache resaltada en naranja con etiqueta **← BACHE DE CAJA**
- Banner amarillo automático cuando duración del cashflow no coincide con semanas del modo seleccionado
- "X× rango" → **"X× más caro"** con números concretos del modo más barato vs más caro

**Lo que se agregó en backend (Addendum v6 — control de cambios):**
- Motor en `lib/engine/change-{types,questions,impact}.ts`
- Modelo Prisma `ChangeImpactAssessment` (relacional a `ChangeRequest`, no lo reemplaza)
- 2 endpoints REST:
  - `POST /api/projects/[id]/changes/[changeId]/impact` — calcula y persiste evaluación
  - `POST /api/projects/[id]/changes/[changeId]/decision` — aplica decisión con guardrail de no absorción invisible
- Validador Zod `changeImpactInputSchema` + `changeImpactDecisionSchema`
- 9 tests unitarios cubriendo los 5 casos de `32_tests_control_cambios.md`

---

## 3. Validación cruzada de fórmulas — TODAS PASAN

Comparación entre `07_motor_formulas.md` (spec) y `lib/engine/*` (implementación):

| Spec | Implementación | Estado |
|---|---|---|
| §1 clarityFactor 1.80/1.50/1.25/1.10/1.00 | [`effort.ts:19-25`](lib/engine/effort.ts#L19) | ✅ idéntico |
| §1 riskFactor = 1+change+unavail+turnover, cap 2.0 | [`effort.ts:75-77`](lib/engine/effort.ts#L75) | ✅ idéntico |
| §1 technical_effort = base × clarity × risk | [`effort.ts:93`](lib/engine/effort.ts#L93) | ✅ idéntico |
| §2 distribución por modo (validación suma ±0.001) | [`effort.ts:108-125`](lib/engine/effort.ts#L108) | ✅ assert activo |
| §3 conservative_factor 1.25 + incertidumbres → cap 1.80 | [`effort.ts:184-193`](lib/engine/effort.ts#L184) | ✅ idéntico |
| §3.bis weeksTotal = effort / (cap × velocity) | [`effort.ts:247`](lib/engine/effort.ts#L247) | ✅ idéntico |
| §4.1 IMSS por ramo (EyM, RT, IV, RT, CEAV escalonada) | [`cost.ts:39-137`](lib/engine/cost.ts#L39) | ✅ desglosado |
| §4.2 ISN × (1+UAZ) = 0.0385 | [`cost.ts:87-90`](lib/engine/cost.ts#L87) | ✅ matemáticamente equivalente |
| §5 subtotal = cost/(1-margin), vat = sub×IVA | [`cost.ts:181-193`](lib/engine/cost.ts#L181) | ✅ idéntico |
| §6 ISR = max(0, utilidad) × 0.30 | [`cost.ts:195-203`](lib/engine/cost.ts#L195) | ✅ idéntico |
| §7 cashflow + working_capital = abs(min) | [`cashflow.ts:25-42`](lib/engine/cashflow.ts#L25) | ✅ idéntico |
| §8 cambios | extensión v6 en [`change-impact.ts`](lib/engine/change-impact.ts) | ✅ amplía con artefactos/fases/contingencia |
| §9 risk_score 5 componentes | [`risk.ts`](lib/engine/risk.ts) | ✅ |
| §10.2 snapshot Parameters al persistir | [`estimate-service.ts`](lib/estimate-service.ts) | ✅ |
| §10.3 versionar sin sobrescribir | [`Estimate.version` unique key](prisma/schema.prisma#L226) | ✅ |

**Extensiones del modelo respecto a la spec original (todas documentadas):**
- 5 modos de desarrollo (no 4): se separa `bytecoding_prompts` de `low_code` (Addendum 22).
- LFT-risk: liquidación automática si proyecto >6 meses con personal `contractType=nomina` (no estaba en spec original; agregado por petición del usuario).
- `effort_efficiency` por modo (0.50–1.00): reduce horas-persona según automatización, además del calendario.
- Penalización aditiva +0.15 a riskFactor cuando low_code/bytecoding entran a alto riesgo (Forrester Wave 2025).
- Contingencia change-impact 10-25% (no 5-20% del addendum) — ajustado a PMBOK 7 real.

---

## 4. Lo que falta (en orden de prioridad)

### Inmediato — siguiente iteración
- **UI wizard de cambio v6** en 5 pasos (29_addendum): solicitud → preguntas → artefactos → resultado → decisión. El backend ya recibe el payload completo; faltan las pantallas que lo capturen. Sugerido en `app/projects/[id]/changes/[changeId]/page.tsx` (nuevo).
- **Cargar `31_seed_parametros_control_cambios_2026.json` a la tabla `Parameter`** y hacer que `change-impact.ts` los lea desde DB (hoy están hardcodeados). Esto cumpliría la regla §10.1 "no hardcodear".

### Mediano plazo
- **Cashflow per-mode**: hoy se guarda una sola vez por proyecto. Idealmente debería regenerarse al recalcular en otro modo (el banner amarillo es paliativo).
- **Sección "Cambios" en los 3 reportes** (municipal, proveedor, académico): tabla de cambios con tipo, decisión, costo, días, riesgo, responsable. Sugerido en `app/projects/[id]/reports/[type]/page.tsx`.
- **Tests E2E** del flujo de cambio v6 (`e2e/control-cambios.spec.ts`).

### Largo plazo / futuras tesis
- Entrenar y aprobar un modelo ML (infra existe en BD: `MLModelRegistry`, `MLModelMetric`, `MLPrediction`, `TrainingCase`).
- NextAuth con los 5 roles del schema.
- Auto-actualización real de `LiveSourceRegistry` (hoy es manual).

---

## 5. Decisiones cerradas — no reabrir sin pedirlo explícitamente

- **Stack**: Next.js 15 App Router + TS estricto + Prisma 6 + SQLite (Postgres-ready). NO Express/FastAPI.
- **5 modos** de desarrollo (no 4).
- **"Bache de caja máximo"** en UI (no "capital de trabajo").
- **"Pago final (cobro)"** en celda del cashflow, con "Finiquito" mantenido en tooltip ligado a LOPSRM.
- **Banner de perspectiva azul** "Proveedor de software" en project detail.
- **Contingencia 10-25%** en change-impact (PMBOK 7, no 5-20% del addendum v6).
- **Penalización aditiva** +0.15 cuando low_code/bytecoding + alto riesgo (Forrester 2025), además del piso 0.90.
- **No NextAuth** todavía (queda en schema, sin guards).
- **No cashflow per-mode** todavía (banner amarillo paliativo).

---

## 6. Cómo retomar trabajo

```bash
# Si el server no está corriendo:
npm run dev -- -p 3003

# Demo ID del proyecto cargado:
#   cmooncdy50000o45wug7zxjxv  (Sistema integral de trámites — Fresnillo)
# 8 módulos · 12 historias · 4 perfiles · 5 modos × 3 escenarios precalculados

# Si quieres ver el proyecto:
#   http://localhost:3003/projects/cmooncdy50000o45wug7zxjxv

# Probar el endpoint v6 de change-impact:
#   POST /api/projects/{projectId}/changes/{changeId}/impact
#   Payload de ejemplo: examples/ejemplo_change_request_municipal.json

# Tests:
npm test -- --run        # 39/39 verde
npm run typecheck        # exit 0
npm run build            # ok

# Para regenerar el demo:
npx tsx prisma/reset-demo-realista.ts
```

---

## 7. Documentos clave del repo

| Archivo | Propósito |
|---|---|
| [README.md](README.md) | Resumen del Addendum v6 (sobreescrito por ChatGPT Pro) |
| [MANUAL.md](MANUAL.md) | Manual operativo + memoria de fases A-H |
| [HANDOFF_CHATGPT.md](HANDOFF_CHATGPT.md) | Snapshot técnico de 521 líneas con prompt para ChatGPT Pro al final |
| [SESSION_STATE.md](SESSION_STATE.md) | **Este archivo** — estado de la sesión actual |
| [00..18_*.md](00_contexto_investigacion.md) | Spec de investigación original (SRS, SDS, modelos, fórmulas, etc.) |
| [19..25_*.md](19_addendum_base_datos_datasets_ml.md) | Addendums Fase D (datasets, ML, fuentes vivas, validación) |
| [26..34_*.md](26_addendum_srs_control_cambios.md) | Addendum v6 control de cambios |
| [17_seed_data_parametros_2026.json](17_seed_data_parametros_2026.json) | Parámetros fiscales 2026 validados |
| [31_seed_parametros_control_cambios_2026.json](31_seed_parametros_control_cambios_2026.json) | Parámetros del motor v6 (aún no cargados a DB) |
| [examples/ejemplo_change_request_municipal.json](examples/ejemplo_change_request_municipal.json) | Payload de ejemplo para probar `/impact` |
