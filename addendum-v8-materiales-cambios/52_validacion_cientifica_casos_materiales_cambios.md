# 52 - Validacion cientifica con casos de cambios y materiales

## Objetivo

Validar si EMPS-Fresnillo ayuda a mejorar la estimacion temprana y la comprension del costo real en proyectos municipales de software.

## Diseño recomendado

Usar 3 a 5 casos de referencia y una comparacion pre-post.

### Caso A: cambio simple temprano
Agregar texto, boton o filtro en una pantalla antes de linea base.

### Caso B: cambio funcional a mitad del desarrollo
Agregar pantalla, reporte y regla de negocio despues de linea base.

### Caso C: cambio estructural tardio
Modificar permisos, base de datos e integracion despues de pruebas o aceptacion.

### Caso D: materiales iniciales
Proveedor ya tiene equipo vs proveedor compra laptops, licencias y nube con factura.

### Caso E: gasto sin factura
Proveedor compra equipo o paga servicios sin CFDI; el sistema muestra impacto en IVA acreditable y deducibilidad.

## Instrumento pre-post

Antes de usar el sistema, pedir a evaluadores:
- estimar horas
- estimar precio
- decidir si es garantia, ajuste, mejora o nuevo alcance
- identificar riesgos
- decir si el proveedor puede sostener financieramente el proyecto

Despues de usar el sistema:
- repetir estimacion
- medir diferencias
- registrar si detectaron costos que no habian considerado
- medir claridad percibida

## Metricas

- diferencia porcentual entre estimacion manual y estimacion asistida
- numero de costos ocultos detectados
- numero de artefactos afectados identificados
- comprension del IVA/materiales
- cambios que requieren nueva linea base
- utilidad percibida por rol

## Resultado esperado

No afirmar que el sistema es exacto. Afirmar si mejora visibilidad, explicabilidad y comparacion de escenarios.
