# Variables de estimación

## Variables del proyecto

- Tipo de sistema.
- Número de áreas usuarias.
- Número de módulos.
- Número de usuarios.
- Reportes requeridos.
- Integraciones.
- Migración de datos.
- Datos personales o sensibles.
- Urgencia.

## Variables del requerimiento

- Claridad de historias.
- Criterios de aceptación.
- Disponibilidad del área usuaria.
- Dependencias de terceros.
- Reglas de negocio.
- Evidencia documental.

## Variables del equipo

- Número de personas.
- Nivel de experiencia.
- Disponibilidad real.
- Modalidad laboral.
- Riesgo de salida.
- Necesidad de supervisión.

## Variables del modo de desarrollo

Modo seleccionable:
- Tradicional.
- Asistido.
- Bytecoding.
- Híbrido.

Atributos del modo (modelados en `development_mode_factors` y `development_mode_velocity` del [17_seed_data_parametros_2026.json](17_seed_data_parametros_2026.json)):

- **Distribución de esfuerzo** por fase: coding, review, testing, documentation, deployment, management/hardening.
- **Velocidad calendario** (`velocity_factor`): cuánto acelera la entrega total respecto al modo tradicional.
- **Aceleración a prototipo** (`prototype_speedup`): cuánto acelera el tiempo a un prototipo funcional (no endurecido).
- **Sobrecosto de endurecimiento** (`hardening_overhead`): % adicional de esfuerzo de validación que el modo añade sobre la línea base.
- **Calidad del prototipo** (`prototype_quality_factor`, solo bytecoding): proporción de la calidad final que entrega el prototipo (default 55% en bytecoding — el restante 45% requiere hardening explícito).

## Variables fiscales y financieras

- Salario mensual.
- Prestaciones.
- Seguridad social.
- Impuesto sobre nóminas.
- IVA.
- ISR.
- Gastos deducibles.
- Gastos no deducibles.
- Anticipo.
- Pagos por entregable.
- Pago final.
- Mantenimiento.
