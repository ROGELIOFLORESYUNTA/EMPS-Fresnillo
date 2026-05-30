# 43. Tests v7

## Unit tests del motor

Agregar pruebas:

1. Cambio pequeño antes de línea base debe dar riesgo bajo.
2. Cambio en producción con base de datos debe dar riesgo crítico.
3. Cambio low-code con alto impacto en seguridad debe aplicar piso 0.90.
4. Solicitud vaga debe generar preguntas.
5. Cambio estructural debe requerir aprobación formal.
6. Cambio después de pruebas debe aumentar phaseFactor.
7. “Incluido sin costo” debe bloquearse si requiere aprobación.
8. Cambio con integración externa debe sugerir nuevo alcance o estructural.
9. Cambio con reporte y permisos debe explicar artefactos afectados.
10. Si faltan parámetros, el motor debe usar fallback y generar advertencia.

## E2E sugeridos

- Registrar cambio.
- Evaluar impacto.
- Ver explicación.
- Aprobar cambio.
- Ver nueva línea base.
- Ver reporte municipal con sección de cambios.
- Ver reporte proveedor con costo de cambio.

## Comandos

```bash
npm test -- --run
npm run typecheck
npm run build
npm run e2e
```
