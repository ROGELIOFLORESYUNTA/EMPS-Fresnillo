# Addendum 25. Validacion cientifica y resultados esperados

## Pregunta operativa

La pregunta operativa del sistema es:

¿La estimacion integral basada en datos, escenarios de desarrollo, variables fiscales-laborales y control de cambios identifica mejor el riesgo de tiempo, costo y viabilidad que una estimacion simple basada en horas?

## Hipotesis ajustada

La estimacion temprana de proyectos de software municipales mejora cuando se integran, en una misma base de datos y en un mismo calculo, variables de requerimientos, cambios, modo de desarrollo, equipo, obligaciones fiscales-laborales, flujo de efectivo y mantenimiento. Bajo esta hipotesis, un sistema que compare escenarios tradicionales, asistidos y de bytecoding deberia detectar riesgos que una cotizacion basada solo en horas no muestra.

## Diseno de comparacion

Para cada caso de prueba se generaran tres resultados:

1. Estimacion simple: horas por tarifa.
2. Estimacion integral sin ML: reglas, formulas, impuestos, nomina, flujo y mantenimiento.
3. Estimacion integral con ajuste ML experimental: rango sugerido por modelo cuando existan datos suficientes.

## Casos minimos

| Caso | Descripcion | Objetivo |
|---|---|---|
| C1 | Sistema municipal pequeno sin datos sensibles | Probar calculo base. |
| C2 | Sistema mediano con reportes e integracion | Probar complejidad funcional. |
| C3 | Sistema con cambios frecuentes de usuario | Probar control de cambios. |
| C4 | Sistema con equipo contratado por nomina | Probar costo fiscal-laboral y flujo. |
| C5 | Sistema desarrollado con bytecoding/codificacion con prompts | Comparar ahorro de codificacion contra revision, pruebas y mantenimiento. |

## Metricas

| Metrica | Que mide |
|---|---|
| Error de esfuerzo | Diferencia entre horas estimadas y reales. |
| Error de costo | Diferencia entre costo estimado y real. |
| Cobertura del rango | Si el resultado real cayo dentro del rango minimo-maximo. |
| Riesgo detectado | Si el sistema anticipo cambios, flujo negativo o mantenimiento insuficiente. |
| Diferencia por modo | Variacion entre tradicional, asistido y bytecoding. |
| Explicabilidad | Si el reporte muestra por que subio o bajo la estimacion. |

## Que se podra concluir despues

Los resultados y discusion no deben escribirse todavia como si ya estuvieran comprobados. Despues de ejecutar los casos, se podra concluir si:

- la estimacion integral detecto costos ocultos de nomina, impuestos o mantenimiento;
- el modo de desarrollo cambio la estimacion de forma significativa;
- el ahorro por bytecoding compenso o no revision, pruebas y refactorizacion;
- los cambios de alcance fueron el factor dominante;
- el dataset local empezo a mejorar la calibracion del modelo.

## Evidencia que debe guardar el sistema

- Version de la estimacion.
- Parametros usados.
- Modo de desarrollo seleccionado.
- Formulas aplicadas.
- Predicciones ML si existen.
- Resultado real cuando se conozca.
- Cambios de alcance registrados.
- Reporte final exportable.
