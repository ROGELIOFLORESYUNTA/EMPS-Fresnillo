# Información investigada faltante — EMPS-Fresnillo v9

Fecha de corte: 2026-05-30

## 1. Hallazgo principal

El sistema no debe mostrar el campo “costo sugerido” como si fuera una cantidad capturada manualmente. Debe presentarse como un rango calculado por el motor y editable con justificación. La razón es que no existe un precio universal para “un cambio” en software: el costo depende de lo que el cambio toca, en qué momento se pide, qué tan claro está, qué modo de desarrollo se usa, qué pruebas se repiten, qué riesgos legales/fiscales agrega y si requiere materiales o servicios adicionales.

La salida recomendada para la pantalla de cambios es:

- **Rango sugerido:** mínimo, probable y conservador.
- **Horas estimadas:** optimista, probable y conservador.
- **Costo antes de IVA:** mano de obra + cargas + gastos administrativos + materiales + contingencia.
- **IVA trasladado:** monto que aparece en factura.
- **IVA acreditable estimado:** solo por compras con CFDI válido y relacionadas con el proyecto.
- **Total a facturar:** subtotal + IVA trasladado.
- **Bache de caja adicional:** dinero que el proveedor necesita antes de cobrar.
- **Mantenimiento incremental:** costo mensual adicional si el cambio aumenta soporte o riesgo.
- **Explicación para Ayuntamiento:** lenguaje no técnico.
- **Explicación para proveedor:** fórmula y desglose.

## 2. Fórmula defendible para costo de cambio

La fórmula propuesta no debe decir “el cambio cuesta X porque sí”. Debe calcularse así:

```text
puntos_artefacto = suma(artefactos_afectados × peso_del_artefacto)

horas_probables = puntos_artefacto
                 × factor_claridad
                 × factor_fase
                 × factor_riesgo
                 × factor_modo_desarrollo
                 × (1 + contingencia_tipo_cambio)

mano_obra = horas_probables × tarifa_hora
cargas = mano_obra × factor_carga_laboral_estimado
administracion = mano_obra × overhead_administrativo
materiales = recursos_asignados_al_cambio
subtotal_antes_iva = mano_obra + cargas + administracion + materiales + contingencia_monetaria
iva_trasladado = subtotal_antes_iva × IVA_GENERAL
iva_acreditable = IVA de compras con CFDI válido y uso indispensable
costo_factura = subtotal_antes_iva + iva_trasladado
costo_neto_proveedor = subtotal_antes_iva + iva_trasladado - iva_acreditable
```

## 3. Por qué no hay un precio fijo por cambio

La literatura y la práctica coinciden en que los cambios no cuestan por “nombre”, sino por impacto. Un cambio llamado “agregar un botón” puede ser barato si solo modifica una pantalla, pero puede ser costoso si implica permisos, base de datos, validaciones, reportes, pruebas, capacitación o seguridad.

Por eso el sistema debe preguntar:

1. ¿Qué se desea cambiar en lenguaje del usuario?
2. ¿Qué artefactos técnicos toca?
3. ¿En qué fase se pide?
4. ¿Es corrección, garantía, ajuste menor, mejora, nuevo alcance o cambio estructural?
5. ¿Afecta datos personales, permisos, integración, auditoría o reportes?
6. ¿Qué pruebas se deben repetir?
7. ¿Requiere materiales, licencias, nube, equipo o servicios externos?
8. ¿Quién autoriza el cambio y cómo se documenta?

## 4. Fuentes técnicas usadas para justificar cambios

| Fuente | Aporte al sistema | Uso recomendado |
|---|---|---|
| Etezadi et al. (2025), ProReFiCIA | Los cambios de requerimientos son costosos de analizar manualmente; LLMs pueden identificar requerimientos impactados con alta cobertura y menor revisión humana. | Justifica preguntas de aclaración, artefactos afectados y análisis de impacto. |
| Sadeghi (2024), scope changes con ML | Los cambios de alcance afectan costo y calendario; variables como magnitud del cambio, dependencias, productividad y WBS son predictoras. | Justifica guardar cambios como dataset local para aprendizaje futuro. |
| Menzies et al. (2016), delayed issue effect | El costo tardío no siempre aumenta igual en todos los proyectos; depende del contexto. | Evita usar multiplicadores exagerados universales. |
| Maier et al. (2026), meta-análisis GenAI | La IA tiene efecto positivo moderado en productividad, con heterogeneidad fuerte. | Justifica que bytecoding reduzca unas fases, pero no todas. |
| Becker et al. (2025), RCT OSS | En proyectos maduros con desarrolladores expertos, la IA puede aumentar tiempo. | Justifica piso de riesgo para bytecoding/low-code cuando hay seguridad, datos o integración. |
| Xu et al. (2025), mantenimiento con IA | AI-assisted programming puede aumentar rework y carga de mantenimiento para expertos. | Justifica mantenimiento incremental y revisión técnica. |
| ITIL 4 / change enablement | Cambios estándar, normales y de emergencia deben tener evaluación y aprobación según riesgo. | Justifica aprobación formal para cambios de alto impacto. |
| PMBOK / gestión de cambios | Los cambios deben analizarse contra línea base de alcance, costo, tiempo y riesgo. | Justifica nueva línea base cuando hay nuevo alcance o cambio estructural. |

## 5. Fuentes fiscales y laborales usadas

| Tema | Fuente oficial | Uso en EMPS |
|---|---|---|
| IVA 16% | LIVA Art. 1 | Factura de proyecto y factura de cambio. |
| IVA acreditable | LIVA Art. 5 | Compras de equipo, nube, licencias o servicios con CFDI válido. |
| ISR persona moral | LISR Art. 9 | Rentabilidad real del proveedor. |
| Depreciación equipo de cómputo | LISR Art. 34 fr. VII | Equipo nuevo usado para el proyecto. |
| Depreciación mobiliario/oficina | LISR Art. 34 fr. III | Escritorios, sillas, oficina. |
| LSS cuotas IMSS | LSS Arts. 25, 73, 106, 107, 147, 168, 211 | Cargas patronales y costo real de nómina. |
| INFONAVIT 5% | Ley INFONAVIT Art. 29 | Aportación patronal sobre salario base. |
| Vacaciones | LFT Art. 76 | Provisión de prestaciones. |
| Prima vacacional | LFT Art. 80 | Provisión de prestaciones. |
| Aguinaldo | LFT Art. 87 | Provisión de prestaciones. |
| PTU | LFT Art. 117 | Riesgo de utilidad gravable y reparto. |
| ISN Zacatecas | Ley de Hacienda estatal, Cap. VI, arts. 37-44 | Impuesto estatal sobre nómina. |
| UAZ adicional | Ley de Ingresos de Zacatecas | Sobretasa sobre impuesto estatal. |
| UMA 2026 | INEGI Comunicado 1/26 | Base para límites y cuotas. |
| Salario mínimo 2026 | CONASAMI / DOF 09-dic-2025 | Piso laboral del sistema. |

## 6. Qué cambiar en el sistema

### Pantalla de cambios

Cambiar el texto de “Costo sugerido” a:

> **Rango sugerido del cambio**
>
> Calculado a partir de artefactos afectados, fase del proyecto, claridad, riesgo, modo de desarrollo, tarifa, cargas, materiales, IVA y mantenimiento.

Agregar debajo:

- Ver desglose para Ayuntamiento.
- Ver desglose para proveedor.
- Ver fuentes y parámetros.
- Marcar como incluido solo con justificación.
- Generar anexo de cambio para firma.

### Pantalla de materiales

Agregar sección:

- Equipo ya existente.
- Equipo nuevo con factura.
- Equipo usado con factura.
- Compra sin factura o sin CFDI válido.
- Licencias y suscripciones.
- Nube y servicios.
- Renta, internet, luz, agua, oficina.
- Asignación al proyecto: 0-100%.
- Tratamiento fiscal: deducible, depreciable, gasto directo, no acreditable, verificar.

### Manual por parámetro

Cada parámetro editable debe tener:

- De dónde sale.
- Qué cálculo afecta.
- Qué pasa si se cambia.
- Fuente oficial.
- Fecha de revisión.
- Advertencia si no es ley, sino calibración metodológica.

## 7. Qué poner en el artículo

Texto breve para metodología:

> El prototipo no asigna un costo arbitrario a las solicitudes de cambio. Para cada cambio se calcula un rango de impacto mediante una combinación de artefactos afectados, fase del proyecto, claridad del requerimiento, riesgo técnico, modo de desarrollo, tarifa horaria, cargas laborales, gastos administrativos, recursos materiales, IVA y posible mantenimiento incremental. El costo sugerido es editable, pero cualquier modificación debe conservar una justificación y quedar registrada en bitácora. Este diseño permite estudiar si una herramienta de estimación temprana reduce la aceptación informal de cambios y mejora la comprensión de costos por parte de usuarios municipales y proveedores.

## 8. Qué no se debe afirmar

- No afirmar que existe una tarifa única mexicana para cualquier cambio.
- No afirmar que bytecoding siempre reduce el costo.
- No afirmar que la IA elimina pruebas, aceptación o mantenimiento.
- No afirmar que el sistema sustituye a un contador o abogado.
- No afirmar que el modelo ya está entrenado con datos locales si todavía está capturando casos.

## 9. Validación sugerida

Con poco tiempo, se puede validar con 3 a 5 casos simulados o reales anonimizados:

1. Cambio pequeño de UI antes de línea base.
2. Cambio de reporte durante desarrollo.
3. Cambio de permisos y datos después de pruebas.
4. Cambio de integración externa después de aceptación.
5. Cambio solicitado en producción.

Para cada caso se registra:

- estimación manual del participante,
- estimación del sistema,
- explicación entendida por el participante,
- decisión final: aprobar, posponer, rechazar o renegociar,
- percepción de utilidad.

La hipótesis se evalúa si el sistema mejora la claridad del costo, identifica impacto oculto y evita aprobar cambios sin evidencia.
