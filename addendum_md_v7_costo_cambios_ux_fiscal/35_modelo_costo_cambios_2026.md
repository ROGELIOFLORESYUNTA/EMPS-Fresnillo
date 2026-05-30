# 35. Modelo de costo de cambios 2026

## Problema

En un proyecto municipal, el cliente suele pedir cambios con lenguaje simple: agregar botón, agregar pantalla, mover dato, sacar reporte. El costo real no depende solo de la frase, sino de los artefactos que toca.

## Principio

Un cambio debe cotizarse por impacto, no por percepción.

## Variables mínimas

1. Fase del proyecto:
   - before_baseline
   - after_baseline
   - in_development
   - after_integration
   - after_testing
   - after_acceptance
   - in_production

2. Artefactos afectados:
   - pantallas UI
   - endpoints/API
   - reglas de negocio
   - tablas de base de datos
   - reportes
   - roles y permisos
   - integraciones externas
   - migración de datos
   - pruebas automatizadas
   - escenarios de prueba manual
   - documentación y capacitación

3. Claridad:
   - 1 = solicitud vaga
   - 5 = requisito claro con criterios de aceptación

4. Riesgo:
   - seguridad
   - datos
   - integración
   - disponibilidad del cliente

5. Modo de desarrollo:
   - traditional
   - ai_assisted
   - hybrid
   - bytecoding_prompts
   - low_code

6. Tipo de cambio:
   - correccion
   - garantia
   - ajuste_menor
   - mejora
   - nuevo_alcance
   - cambio_estructural

## Fórmula conceptual

```text
artifactPoints = sum(artifactCount * artifactWeight)
baseHours = artifactPoints * clarityFactor * phaseFactor * riskFactor * modeFactor
contingencyHours = baseHours * contingencyRate
probableHours = baseHours + contingencyHours
costImpact = probableHours * hourlyRate
```

## Regla de alto riesgo

Si el cambio toca datos, seguridad o integración externa con impacto alto, el modo bytecoding o low-code no puede bajar demasiado el costo. En esos casos se aplica un piso de modo.

```text
if securityImpact >= 2 or dataImpact >= 2 or integrationImpact >= 2:
    modeFactor = max(modeFactor, 0.90)
```

## Interpretación para usuario no técnico

- Bajo costo: afecta una pantalla o texto y no cambia datos ni reglas.
- Costo medio: afecta una pantalla, una regla y pruebas.
- Costo alto: afecta base de datos, reportes, permisos o integración.
- Costo crítico: cambia estructura, seguridad, migración o producción.

## Regla de línea base

Un cambio requiere nueva línea base si:

- modifica base de datos relevante;
- agrega integración externa;
- cambia permisos o seguridad;
- modifica entregables aceptados;
- se solicita después de pruebas o aceptación;
- afecta mantenimiento mensual.
