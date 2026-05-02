# Addendum 21. Pipeline de datos y machine learning

## Objetivo del pipeline

Convertir la investigacion en un proceso medible. El sistema captura informacion del proyecto, la transforma en variables comparables, calcula escenarios y, conforme exista evidencia, entrena modelos que ayuden a estimar esfuerzo, costo y riesgo.

## Pipeline propuesto

### 1. Captura

El usuario registra:

- tipo de sistema;
- area municipal solicitante;
- modulos;
- historias de usuario;
- integraciones;
- reportes;
- pantallas;
- datos personales o sensibles;
- disponibilidad del usuario;
- claridad del requerimiento;
- modo de desarrollo;
- equipo, roles, sueldos, disponibilidad y tipo de contrato;
- forma de cobro;
- mantenimiento esperado;
- cambios de alcance.

### 2. Normalizacion

El sistema transforma texto y valores capturados en variables comparables:

- `requirements_clarity`: claridad del requerimiento de 0 a 100;
- `stakeholder_availability`: disponibilidad del usuario de 0 a 100;
- `complexity_score`: complejidad tecnica;
- `integration_score`: peso de integraciones;
- `data_risk_score`: riesgo por datos personales, seguridad y auditoria;
- `change_volatility`: probabilidad de cambios;
- `dev_mode_code`: modo de desarrollo;
- `team_capacity`: capacidad mensual real del equipo;
- `fiscal_labor_risk_score`: riesgo por nomina, impuestos, flujo y contratos.

### 3. Calculo base

Antes de usar ML, el sistema calcula una estimacion transparente:

```text
esfuerzo_base = complejidad_funcional + integraciones + reportes + seguridad + despliegue + capacitacion
esfuerzo_ajustado = esfuerzo_base * factor_requerimientos * factor_cambios * factor_modo_desarrollo * factor_equipo
costo_total = costo_tecnico + costo_nomina + impuestos + herramientas + administracion + mantenimiento + margen
riesgo = riesgo_tecnico + riesgo_cambios + riesgo_fiscal_laboral + riesgo_flujo_efectivo
```

Este calculo permite explicar de donde sale la estimacion y evita que el resultado parezca una caja negra.

### 4. Modelo ML experimental

Cuando haya datos suficientes, se entrenan modelos separados:

| Modelo | Variable objetivo | Datos de entrenamiento inicial |
|---|---|---|
| `effort_range_model` | esfuerzo real en horas | JOSSE, SEERA y casos locales |
| `change_risk_model` | probabilidad o intensidad de cambios | Public Jira y casos locales |
| `cost_deviation_model` | desviacion entre costo estimado y real | SEERA y casos locales |
| `mode_factor_model` | ajuste por modo de desarrollo | casos locales y evidencia experimental |

El primer modelo puede ser sencillo: regresion lineal regularizada, random forest o gradient boosting. No conviene empezar con un modelo complejo si todavia no hay suficientes casos locales.

### 5. Evaluacion

Cada modelo debe guardar metricas:

- MAE: error absoluto medio;
- RMSE: penaliza errores grandes;
- MAPE: error porcentual medio, si no hay valores cercanos a cero;
- error por tipo de proyecto;
- error por modo de desarrollo;
- error por tamano de proyecto;
- proporcion de estimaciones cuyo rango si cubrio el resultado real.

### 6. Retroalimentacion

Cuando el proyecto avance, se registra el resultado real:

- duracion real;
- costo real;
- horas reales;
- cambios aceptados;
- cambios rechazados;
- incidencias de mantenimiento;
- problemas de flujo de efectivo;
- salida de personal;
- diferencia entre lo cotizado y lo ocurrido.

Con esto el sistema deja de depender solamente de literatura y empieza a formar un dataset propio.

## Regla importante

El ML no sustituye el criterio contable, tecnico ni juridico. El sistema debe mostrar el calculo explicable y despues el ajuste sugerido por el modelo. Si ambos difieren mucho, debe marcarse como riesgo y pedir revision.
