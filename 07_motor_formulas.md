# Motor de fórmulas

> **Reconciliación Fase B.3 (2026-05-01):** todas las fórmulas reflejan el JSON seed canónico [17_seed_data_parametros_2026.json](17_seed_data_parametros_2026.json). Sin valores hardcodeados — el motor lee parámetros del repositorio.

## 1. Esfuerzo base

```
base_points = modules_complexity
            + integrations
            + reports
            + data_migration
            + security_weight
```

Cada componente es un puntaje calibrado por módulo (1-10 típicamente).

### Factor de claridad (madurez del requerimiento)

```
clarity_factor:
  1 (incompleto)        = 1.80
  2 (ambiguo)           = 1.50
  3 (entendible)        = 1.25
  4 (validado)          = 1.10
  5 (listo para estimar)= 1.00
```

### Factor de riesgo

```
risk_factor = 1 + change_probability
                + client_unavailability
                + turnover_risk
```

Cada sumando es 0.0–0.3 típicamente; tope sugerido `risk_factor ≤ 2.0`.

### Esfuerzo técnico

```
technical_effort = base_points × clarity_factor × risk_factor
```

## 2. Distribución por modo de desarrollo

> **Semántica:** los coeficientes son **multiplicadores sobre `technical_effort`** que representan la cantidad de trabajo de cada fase. La suma habitual es **1.0** (= 100% del esfuerzo técnico). **Bytecoding suma 1.10** intencionalmente — el `hardening` es trabajo *adicional* de verificación que se acumula sobre la base, no la sustituye. Esta es la señal que hace al modelo realista: "bytecoding produce código rápido, pero requiere más revisión y endurecimiento — el costo total puede ser mayor, no menor".

### Tabla canónica (debe coincidir 1:1 con `development_mode_factors` del JSON seed)

| Modo | coding | review | testing | documentation | deployment | management/hardening | **Suma** |
|---|---:|---:|---:|---:|---:|---:|---:|
| Traditional | 0.45 | 0.10 | 0.20 | 0.10 | 0.05 | 0.10 *(mgmt)* | **1.00** |
| Assisted | 0.35 | 0.18 | 0.22 | 0.10 | 0.05 | 0.10 *(mgmt)* | **1.00** |
| **Bytecoding** | 0.25 | 0.28 | 0.27 | 0.10 | 0.05 | 0.15 *(hardening)* | **1.10** |
| Hybrid | 0.32 | 0.20 | 0.24 | 0.10 | 0.05 | 0.09 *(mgmt)* | **1.00** |

### Cálculo por fase

```
For each mode:
  coding_hours        = technical_effort × mode.coding
  review_hours        = technical_effort × mode.review
  testing_hours       = technical_effort × mode.testing
  documentation_hours = technical_effort × mode.documentation
  deployment_hours    = technical_effort × mode.deployment

  IF mode == "bytecoding":
      hardening_hours = technical_effort × mode.hardening
      management_hours = 0
  ELSE:
      management_hours = technical_effort × mode.management
      hardening_hours  = 0

  total_effort_hours = sum of all phase hours
```

> **Nota de validación obligatoria:** el motor debe assertar `abs(sum(coefficients) - expected_sum) < 0.01`. `expected_sum = 1.10` para bytecoding, `1.00` para los demás. Cualquier alteración de los coeficientes debe activar este check.

## 3. Escenarios

```
optimistic_effort   = total_effort_hours × 0.85
probable_effort     = total_effort_hours × 1.00
conservative_effort = total_effort_hours × conservative_factor
```

Donde `conservative_factor` ∈ [1.25, 1.80] según incertidumbre acumulada:

```
conservative_factor = 1.25
  + 0.10 if requirements_clarity_avg < 3
  + 0.10 if external_integrations_count > 2
  + 0.10 if sensitive_data == true
  + 0.10 if change_probability > 0.3
  + 0.05 if client_availability < 0.5
  (cap at 1.80)
```

## 3.bis Tiempo calendario y velocidad por modo

> **Importante:** los coeficientes de la §2 modelan **horas-persona**. Pero la decisión "qué modo elegir" también depende del **tiempo calendario** (semanas a prototipo, semanas a entrega) — y aquí es donde bytecoding gana aunque sume 1.10 horas-persona. Este apartado lo modela.

### Parámetros (`development_mode_velocity` del JSON seed)

| Modo | velocity_factor | prototype_speedup | hardening_overhead | prototype_quality |
|---|---:|---:|---:|---:|
| Traditional | 1.00 | 1.00 | 0.00 | — |
| Assisted | 1.25 | 1.50 | 0.05 | — |
| **Bytecoding** | 1.40 | **3.50** | 0.15 | 0.55 |
| Hybrid | 1.30 | 2.20 | 0.08 | — |

### Fórmulas calendario

```
team_weekly_capacity = sum( profile.availability × profile.hours_per_week
                            × profile.productivity_factor )

# Semanas totales (entrega final endurecida)
weeks_total = total_effort_hours
            / (team_weekly_capacity × mode.velocity_factor)

# Semanas a prototipo funcional (no endurecido)
weeks_to_prototype = (technical_effort × mode.coding)
                   / (team_weekly_capacity × mode.velocity_factor × mode.prototype_speedup)

# Calidad del prototipo (solo informativa para bytecoding)
IF mode == "bytecoding":
    prototype_quality_pct = mode.prototype_quality_factor   # 0.55 default
    remaining_to_production_hours = total_effort_hours × (1 − prototype_quality_pct)
```

### Ejemplo intuitivo

Proyecto con `technical_effort = 1000h`, equipo de 2 personas con capacidad 60h/semana:

| Modo | horas-persona | velocidad | semanas total | semanas prototipo | señal |
|---|---:|---:|---:|---:|---|
| Traditional | 1000 | 1.00 | 16.7 | ~7.5 | calendario más predecible |
| Assisted | 1000 | 1.25 | 13.3 | ~3.7 | mejora moderada |
| **Bytecoding** | **1100** | **1.40** | **13.1** | **~1.6** | **prototipo en ~1/5 del tiempo, total similar** |
| Hybrid | 1000 | 1.30 | 12.8 | ~2.7 | mejor balance |

**Lectura:** bytecoding NO ahorra horas-persona (1100 > 1000), pero entrega un prototipo funcional **5× más rápido** y termina en plazo similar. Su valor está en feedback temprano del Ayuntamiento, no en costo total.

## 4. Costo fiscal-laboral por perfil

```
monthly_profile_cost =
    salary
  + benefits_provisions          # aguinaldo + prima vac + vacaciones (proporcional)
  + social_security              # IMSS patronal por ramos (ver §4.1)
  + payroll_tax                  # ISN × (1 + adicional_uaz)
  + infonavit                    # 5% del SBC patronal
  + tools_cost
  + admin_overhead
```

### 4.1 Carga social IMSS detallada (suma sobre SBC)

```
imss_patronal =
    EYM_especie_cuota_fija_patron × UMA_diaria × dias_cotizados_mes
  + EYM_especie_excedente_patron × max(SBC_diario - 3 × UMA_diaria, 0) × dias
  + EYM_dinero_patron × SBC_diario × dias
  + EYM_pensionados_patron × SBC_diario × dias
  + IMSS_riesgo_trabajo_clase × SBC_diario × dias        # según clase de empresa
  + IMSS_invalidez_vida_patron × SBC_diario × dias
  + IMSS_guarderias_patron × SBC_diario × dias
  + IMSS_retiro_patron × SBC_diario × dias
  + ceav_patron(SBC_en_UMA) × SBC_diario × dias          # tabla escalonada 2026

infonavit_patronal = INFONAVIT_PATRON × SBC_diario × dias
```

### 4.2 ISN Zacatecas + sobretasa UAZ

```
base_isn = total_remuneraciones_mes
isn_neto = base_isn × ISN_ZACATECAS
adicional_uaz = isn_neto × IMPUESTO_UAZ
isn_total = isn_neto + adicional_uaz
# Equivale a base_isn × ISN_ZACATECAS × (1 + IMPUESTO_UAZ) = base_isn × 0.0385
```

### 4.3 Modo "factor estimado" (fallback)

Cuando el proveedor no desglose, el motor usa:

```
monthly_profile_cost ≈ salary × (1 + carga_patronal_factor)
# carga_patronal_factor por defecto: 0.40 (ver tabla en 03_parametros_fiscales_laborales_2026.md)
```

## 5. Precio

```
subtotal      = total_cost / (1 - target_margin_percent)
vat           = subtotal × IVA_GENERAL                  # 0.16 (LIVA Art. 1)
total_invoice = subtotal + vat
margin_amount = subtotal − total_cost
```

## 6. ISR preliminar

```
utilidad_fiscal_aprox = subtotal − gastos_deducibles − gastos_no_deducibles_ajustados
isr_estimado          = utilidad_fiscal_aprox × ISR_PERSONA_MORAL    # 0.30 (LISR Art. 9)
```

> El motor debe mostrar advertencia obligatoria: "Cálculo preliminar. La determinación oficial requiere revisión profesional según régimen fiscal y deducciones reales."

## 7. Flujo de efectivo

```
For month_n in 1..N:
  net_flow[n]         = income[n] − sum(outflows[n])
  accumulated[n]      = accumulated[n-1] + net_flow[n]
  # accumulated[0] = 0

required_working_capital = abs(min(accumulated[1..N], 0))
```

Si `required_working_capital > capital_declarado_proveedor` → marcar **riesgo financiero alto** en el reporte.

## 8. Cambios

```
impacto_cambio = impacto_modulo
               + impacto_datos
               + impacto_pruebas
               + impacto_capacitacion
               + impacto_documentacion
```

Clasificación: corrección · garantía · ajuste menor · mejora · nuevo alcance.

## 9. Riesgo agregado

```
risk_score = technical_risk
           + requirements_risk
           + fiscal_risk
           + cash_flow_risk
           + change_risk
```

Cada componente normalizado 0.0–1.0; `risk_score` máximo = 5.0.

Umbrales sugeridos:
- < 1.5 → bajo (verde)
- 1.5–3.0 → medio (amarillo)
- 3.0–4.0 → alto (naranja)
- > 4.0 → crítico (rojo)

## 10. Reglas obligatorias del motor

1. **No hardcodear** ningún valor numérico — todo se lee del repositorio `Parameter`.
2. **Snapshot** de parámetros usados al persistir cada `Estimate` (campo `parameters_snapshot`).
3. **Versionar** estimaciones; nunca sobrescribir.
4. **Validar suma** de coeficientes de modo de desarrollo en cada cálculo.
5. **Advertir** ante datos incompletos antes de presentar resultado.
6. **Tests unitarios** obligatorios (RNF-02 + [14_prompt_para_claude.md](14_prompt_para_claude.md)).
