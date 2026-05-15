LQ# Addendum 22. Comparacion de desarrollo tradicional, asistencia generativa y bytecoding

## Proposito

El sistema debe comparar modos de desarrollo porque en 2026 ya no todos los proyectos se construyen igual. Un proyecto puede hacerse con programacion tradicional, con asistencia generativa, con bytecoding/codificacion con prompts, con low-code o con una mezcla. La estimacion cambia porque no solo cambia la velocidad de escribir codigo; tambien cambian revision, pruebas, arquitectura, documentacion, mantenimiento y riesgo.

## Variables nuevas por modo de desarrollo

| Variable | Significado |
|---|---|
| `requirements_factor` | Ajuste por claridad del requerimiento. Si el usuario no sabe explicar, ningun modo de desarrollo compensa totalmente el problema. |
| `coding_factor` | Ajuste sobre el tiempo de codificacion. Puede bajar con herramientas generativas o bytecoding. |
| `review_factor` | Ajuste por revision humana, lectura de codigo generado y correccion. Puede subir aunque la codificacion baje. |
| `testing_factor` | Ajuste por pruebas necesarias para asegurar que lo generado funciona. |
| `refactor_factor` | Ajuste por arquitectura, limpieza, separacion de capas y mantenibilidad. |
| `documentation_factor` | Ajuste por documentacion tecnica, manuales y transferencia. |
| `maintenance_risk_factor` | Riesgo de que lo construido rapido sea mas costoso de mantener. |

## Comparacion conceptual

| Modo | Ventaja | Riesgo | Como se refleja en el sistema |
|---|---|---|---|
| Tradicional | Mayor control y revision si el equipo es formal. | Mas lento y mas caro si todo se hace manual. | `coding_factor` cercano a 1.0; `review_factor` estable; menor incertidumbre si hay experiencia. |
| Asistido por herramientas generativas | Puede acelerar tareas repetitivas, documentacion, pruebas y partes de codigo. | Puede requerir revision, correccion y contexto tecnico. | Baja `coding_factor`, pero puede subir `review_factor` y `testing_factor`. |
| Bytecoding/codificacion con prompts | Permite prototipos rapidos y avance funcional temprano. | Puede generar deuda tecnica si no se controla arquitectura, seguridad y pruebas. | Baja mas `coding_factor`, pero sube `refactor_factor`, `testing_factor` y `maintenance_risk_factor` si el proyecto es critico. |
| Low-code/configuracion | Rapido para formularios, CRUD y flujos simples. | Limitaciones por plataforma, licencias, seguridad o integracion. | Baja esfuerzo tecnico en modulos simples, pero agrega riesgo de dependencia y licenciamiento. |
| Hibrido | Permite usar cada modo donde conviene. | Requiere gestion tecnica para no mezclar sin control. | Calcula por modulo y no por proyecto completo. |

## Formula recomendada por fases

En lugar de aplicar un solo multiplicador global, el sistema debe separar fases:

```text
horas_requerimientos = base_requerimientos * requirements_factor
horas_codigo = base_codigo * coding_factor
horas_revision = base_revision * review_factor
horas_pruebas = base_pruebas * testing_factor
horas_refactor = base_refactor * refactor_factor
horas_documentacion = base_documentacion * documentation_factor
horas_totales = suma_de_fases + reserva_cambios + reserva_mantenimiento
```

Con esto se evita el error de decir que un proyecto baja 50% solo porque se escribe codigo mas rapido. Puede bajar la codificacion, pero subir revision, pruebas o mantenimiento.

## Escenarios minimos que debe mostrar el sistema

Para cada proyecto, el sistema debe mostrar al menos cuatro estimaciones:

1. Escenario tradicional.
2. Escenario asistido por herramientas generativas.
3. Escenario bytecoding/codificacion con prompts.
4. Escenario hibrido recomendado.

Cada escenario debe mostrar:

- tiempo minimo, esperado y maximo;
- costo directo;
- costo fiscal-laboral;
- flujo de efectivo;
- riesgo de cambio;
- riesgo de mantenimiento;
- explicacion de por que sube o baja.

## Como defenderlo en la investigacion

La hipotesis no es que bytecoding siempre reduzca el costo. La hipotesis correcta es que la estimacion mejora cuando el modo de desarrollo se modela explicitamente por fases. El sistema debe probar si el ahorro de codificacion compensa o no el costo de revision, pruebas, refactorizacion, mantenimiento, nomina y riesgo financiero.
