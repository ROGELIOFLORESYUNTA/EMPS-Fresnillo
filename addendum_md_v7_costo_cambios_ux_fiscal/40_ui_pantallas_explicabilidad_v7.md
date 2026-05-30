# 40. UI - pantallas y explicabilidad v7

## Problema visual actual

La pantalla de cambios muestra tipo, descripción, horas, costo y decisión. Eso es útil, pero todavía no explica suficientemente por qué el cambio cuesta eso.

## Pantalla propuesta

Ruta:

```text
/projects/[id]/changes/[changeId]/impact
```

## Diseño

### Encabezado

- Título: Evaluar cambio
- Subtítulo: Convierte una solicitud vaga en impacto técnico, costo y decisión.

### Paso 1 - Solicitud

Formulario con lenguaje natural.

### Paso 2 - Preguntas

Mostrar preguntas sugeridas por el motor.

### Paso 3 - Artefactos afectados

Usar tarjetas con iconos:

- Pantallas
- Datos
- Reglas
- Reportes
- Permisos
- Integraciones
- Pruebas
- Capacitación

### Paso 4 - Resultado

Cuatro tarjetas:

1. Horas probables
2. Costo estimado
3. Días de impacto
4. Riesgo

### Paso 5 - De dónde sale

Panel colapsable:

```text
Puntos de artefactos: 64
Claridad: 1.35
Fase: 2.20
Riesgo: 1.24
Modo: 0.90
Contingencia: 20%
```

### Paso 6 - Decisión

Opciones:

- Aprobar y cotizar
- Rechazar
- Pedir aclaración
- Diferir
- Incluir por garantía

Si el cambio es de alto riesgo, no permitir “incluir sin costo” sin comentario.

## Textos de ayuda

- “Un cambio puede parecer pequeño, pero tocar datos, permisos o reportes.”
- “Si se pide después de pruebas, aumenta retrabajo.”
- “La codificación con prompts reduce parte de la implementación, pero no elimina pruebas ni aceptación.”
- “Si se acepta este cambio, se recomienda actualizar la línea base del proyecto.”

## Vista investigación

Agregar botón:

```text
Exportar evidencia para artículo
```

Debe generar JSON/CSV con:

- solicitud original;
- artefactos afectados;
- fórmula;
- resultado;
- decisión;
- fecha;
- usuario;
- parámetros usados.
