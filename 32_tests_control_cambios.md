# 32. Tests - Control de cambios

## Unit tests sugeridos

Archivo:

```text
tests/change-impact.test.ts
```

## Casos mínimos

### 1. Ajuste menor al inicio

Entrada: texto simple, 1 pantalla, fase `before_baseline`, claridad 5.

Esperado:

- Riesgo bajo.
- No requiere nueva línea base.
- Horas bajas.

### 2. Botón con permisos y reporte después de pruebas

Entrada: 1 pantalla, 1 endpoint, 1 tabla, 1 reporte, permisos, fase `after_testing`.

Esperado:

- Tipo sugerido: mejora.
- Requiere aprobación formal.
- Aumenta calendario.

### 3. Cambio estructural en producción

Entrada: base de datos, integración externa, seguridad alta, fase `in_production`.

Esperado:

- Riesgo crítico.
- Factor de modo no baja de 0.90 aunque sea bytecoding.
- Requiere nueva línea base.

### 4. Cambio vago

Entrada: claridad 1 y texto corto.

Esperado:

- Preguntas de aclaración obligatorias.
- No debe aprobarse sin comentario.

### 5. Comparación de modos

Entrada idéntica con traditional, hybrid y bytecoding_prompts.

Esperado:

- Bytecoding reduce parte de horas cuando no hay alto riesgo.
- Si hay seguridad/datos/integración alta, se aplica piso de riesgo.

## E2E sugerido

Archivo:

```text
e2e/control-cambios.spec.ts
```

Flujo:

1. Crear proyecto demo.
2. Entrar a cambios.
3. Registrar solicitud: "agregar botón de autorización del director".
4. Seleccionar fase después de pruebas.
5. Marcar pantalla, permisos, tabla y reporte.
6. Ejecutar estimación.
7. Confirmar que aparece costo, días, riesgo y preguntas.
8. Aprobar cambio.
9. Confirmar que el reporte municipal muestra el cambio.
