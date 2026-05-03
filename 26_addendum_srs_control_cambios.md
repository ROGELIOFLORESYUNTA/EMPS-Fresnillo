# 26. Addendum SRS - Control de cambios estimable

## 1. Propósito

Agregar al sistema un módulo de control de cambios que permita registrar solicitudes en lenguaje común, clasificarlas, estimar impacto y decidir si pertenecen a garantía, ajuste menor, mejora, nuevo alcance o cambio estructural.

## 2. Problema del usuario

En proyectos municipales el solicitante puede pedir cambios con frases vagas:

- "Agregar un botón".
- "Hacer otra pantalla".
- "Que mande aviso".
- "Que salga en el reporte".
- "Que lo vea el director".
- "Que también lo firme otra área".

El solicitante no sabe si eso toca base de datos, permisos, reglas de negocio, integración, pruebas o capacitación. El proveedor tampoco siempre explica el impacto. El sistema debe servir como traductor entre lenguaje del cliente y variables técnicas estimables.

## 3. Requerimientos funcionales nuevos

### RF-CAM-01. Capturar solicitud de cambio

El sistema debe permitir registrar:

- Texto original del cliente.
- Área solicitante.
- Persona que autoriza.
- Fecha de solicitud.
- Fase del proyecto.
- Motivo del cambio.
- Urgencia.
- Evidencia adjunta opcional.

### RF-CAM-02. Clasificar tipo de cambio

El sistema debe sugerir una clasificación:

1. Corrección.
2. Garantía.
3. Ajuste menor.
4. Mejora.
5. Nuevo alcance.
6. Cambio estructural.

El usuario autorizado podrá ajustar la clasificación.

### RF-CAM-03. Traducir solicitud a artefactos afectados

El sistema debe preguntar y/o sugerir si el cambio afecta:

- Pantallas.
- API o lógica de negocio.
- Base de datos.
- Permisos y roles.
- Reportes.
- Integraciones.
- Migración de datos.
- Seguridad.
- Pruebas.
- Documentación y capacitación.
- Despliegue.

### RF-CAM-04. Estimar impacto del cambio

El sistema debe calcular:

- Horas estimadas.
- Rango optimista, probable y conservador.
- Costo estimado.
- Impacto en calendario.
- Nivel de riesgo.
- Necesidad de pruebas.
- Si modifica o no la línea base del proyecto.

### RF-CAM-05. Comparar por modo de desarrollo

El cambio debe poder estimarse según modo:

- Tradicional.
- Asistido.
- Híbrido.
- Codificación con prompts.
- Bajo código.

No se debe asumir que el modo más rápido siempre es mejor. El sistema debe separar codificación, revisión, pruebas, integración y aceptación.

### RF-CAM-06. Decisión formal

Cada cambio debe terminar en una decisión:

- Aprobado.
- Rechazado.
- Diferido.
- Convertido en nuevo alcance.
- Requiere aclaración.

La decisión debe guardar fecha, responsable y comentario.

### RF-CAM-07. Actualizar estimación sin sobrescribir historial

Si un cambio se aprueba, el sistema debe generar una nueva versión de estimación o un impacto asociado, sin borrar la estimación anterior.

## 4. Requerimientos no funcionales

- Trazabilidad: cada cambio debe quedar asociado a proyecto, módulo, historia y estimación cuando aplique.
- Explicabilidad: el sistema debe mostrar por qué el cambio cuesta lo que cuesta.
- Lenguaje claro: las salidas deben entenderse por usuario municipal y por proveedor.
- Auditoría: todo cambio y decisión debe quedar en bitácora.
- Portabilidad: mantener compatibilidad SQLite/PostgreSQL.

## 5. Criterios de aceptación

- Un usuario puede registrar una solicitud vaga y convertirla en una clasificación estimable.
- El sistema muestra artefactos afectados antes de calcular costo.
- El sistema separa garantía, ajuste menor, mejora y nuevo alcance.
- El sistema muestra impacto en horas, costo, semanas, riesgo y pruebas.
- La estimación original no se sobrescribe.
- El reporte municipal explica si el cambio está incluido o si requiere autorización adicional.
