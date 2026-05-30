# 36. SRS aditivo - UX para costo de cambios

## Objetivo

Agregar una experiencia entendible para registrar, calcular y decidir cambios.

## Usuarios

- Usuario Ayuntamiento: necesita saber si el cambio es garantía, nuevo alcance, mejora o riesgo de retraso.
- Proveedor: necesita saber horas, costo, margen, bache de caja y mantenimiento.
- Investigador: necesita guardar evidencia para validar la hipótesis.

## Requerimientos funcionales

### RF-CC-01 Wizard de cambio

Crear una pantalla nueva o mejorar la existente:

```text
/projects/[id]/changes/[changeId]/impact
```

Pasos:

1. Solicitud en lenguaje natural.
2. Preguntas de aclaración.
3. Artefactos afectados.
4. Resultado de impacto.
5. Decisión y reporte.

### RF-CC-02 Solicitud en lenguaje del cliente

Campos:

- qué pide;
- quién lo pide;
- por qué lo pide;
- fecha;
- si es por auditoría, ley, cabildo, área usuaria o mejora interna;
- fecha límite deseada.

### RF-CC-03 Preguntas guiadas

El sistema debe preguntar:

- ¿en qué pantalla o flujo se verá?
- ¿qué dato nuevo guarda?
- ¿afecta permisos?
- ¿sale en algún reporte?
- ¿requiere firma o autorización?
- ¿afecta integración externa?
- ¿cómo se aceptará terminado?

### RF-CC-04 Explicación del costo

Mostrar una tarjeta:

```text
Este cambio cuesta porque afecta:
- 2 pantallas
- 1 regla de negocio
- 1 tabla de base de datos
- permisos
- 3 pruebas manuales
```

### RF-CC-05 Vista Ayuntamiento

Debe mostrar:

- clasificación del cambio;
- costo estimado;
- días de impacto;
- si se cobra o entra en garantía;
- si requiere aprobación formal;
- si mueve la fecha de entrega;
- si cambia mantenimiento.

### RF-CC-06 Vista Proveedor

Debe mostrar:

- horas optimistas, probables y conservadoras;
- tarifa usada;
- costo directo;
- contingencia;
- precio mínimo sugerido;
- impacto en flujo de efectivo;
- riesgo de absorberlo sin autorización.

### RF-CC-07 Explicabilidad normativa

Cada parámetro fiscal-laboral debe tener:

- fuente;
- artículo o fundamento;
- fecha de vigencia;
- última revisión;
- si requiere validación contable/legal.

## Requerimientos no funcionales

- Lenguaje claro.
- Sin jerga técnica en vista Ayuntamiento.
- Fórmulas visibles en vista proveedor/investigación.
- Todos los cálculos auditables.
- Ningún parámetro fiscal/laboral hardcodeado si ya existe tabla Parameter.
