# 33. Anexo metodológico para artículo - Cambios

Texto sugerido para integrar en metodología:

El control de cambios se incorporó como una dimensión principal de la estimación temprana. Cada solicitud se registra primero en el lenguaje original del solicitante y después se transforma en variables técnicas: fase del proyecto, tipo de cambio, claridad del requerimiento, artefactos afectados, riesgo de seguridad, impacto en datos, integraciones, pruebas y necesidad de autorización. Esta decisión permite distinguir entre correcciones, ajustes menores, mejoras, nuevos alcances y cambios estructurales.

La estimación del cambio no se calcula como una cantidad fija, sino como un rango. El rango considera la fase en que aparece la solicitud, ya que no tiene el mismo impacto modificar un requerimiento antes de la línea base que hacerlo después de pruebas o aceptación. También considera el modo de desarrollo. La codificación con prompts puede disminuir el tiempo de implementación en ciertos cambios, pero no elimina actividades de análisis, revisión, pruebas, validación del cliente ni mantenimiento.

El prototipo registra cada cambio y conserva el historial de estimaciones para comparar posteriormente la estimación inicial, la estimación ajustada y el resultado real. Con suficientes casos, esta información podrá alimentar modelos de aprendizaje automático orientados a predecir desviaciones, riesgo de cambios y posibles defectos asociados a solicitudes de modificación.
