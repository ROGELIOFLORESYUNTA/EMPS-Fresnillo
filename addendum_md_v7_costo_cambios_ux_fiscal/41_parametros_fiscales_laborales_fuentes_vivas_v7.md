# 41. Parámetros fiscales-laborales y fuentes vivas v7

## Objetivo

Evitar que el sistema quede obsoleto cuando cambien leyes, UMA, salario mínimo, jornada laboral, impuestos o tasas estatales.

## Fuentes mínimas

- Ley Federal del Trabajo.
- Ley del Seguro Social.
- Ley del Impuesto sobre la Renta.
- Ley del Impuesto al Valor Agregado.
- INEGI UMA.
- CONASAMI salario mínimo.
- SEFIN Zacatecas impuesto sobre nóminas.
- Ley de Hacienda del Estado de Zacatecas.

## Parámetros que deben tener fuente

- IVA_GENERAL
- ISR_PERSONA_MORAL
- UMA_DIARIA
- UMA_MENSUAL
- SALARIO_MINIMO_GENERAL_DIARIO
- ISN_ZACATECAS
- UAZ_SOBRETASA
- LFT_VACACIONES_PRIMER_ANIO_DIAS
- LFT_PRIMA_VACACIONAL
- LFT_AGUINALDO_DIAS
- LFT_INDEMNIZACION_3_MESES
- LFT_20_DIAS_POR_ANIO
- JORNADA_SEMANAL_LEGAL
- JORNADA_SEMANAL_ESCENARIO_40H

## Cambio normativo en jornada laboral

Si una reforma reduce jornada de 48 a 40 horas de manera gradual, no aplicarla como vigente sin parámetro aprobado. Manejarla como escenario:

```text
scenario_capacity_2026 = 48 horas
scenario_capacity_2027 = 46 horas si la reforma entra en vigor
scenario_capacity_2028 = 44 horas
scenario_capacity_2029 = 42 horas
scenario_capacity_2030 = 40 horas
```

## Pantalla admin

Agregar columna:

- vigente
- propuesto
- escenario
- pendiente de validar

## Advertencia obligatoria

El sistema no sustituye asesoría contable, fiscal o legal. Sirve para estimación preliminar y análisis de viabilidad.
