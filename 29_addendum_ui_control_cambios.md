# 29. Addendum UI - Control de cambios entendible

## 1. Ubicación de pantallas

Integrar sobre la sección actual:

```text
app/projects/[id]/changes/page.tsx
```

Agregar detalle:

```text
app/projects/[id]/changes/[changeId]/page.tsx
app/projects/[id]/changes/new/page.tsx
```

## 2. Flujo de usuario

### Paso 1. Solicitud en lenguaje del cliente

Campo grande:

> Escribe exactamente lo que pidió el área usuaria.

Ejemplo:

> "Quieren agregar un botón para que el director autorice el trámite y salga en el reporte mensual".

### Paso 2. Preguntas de aclaración

Mostrar checklist:

- ¿Qué usuario lo va a usar?
- ¿Qué pantalla toca?
- ¿Qué dato nuevo se guarda?
- ¿Cambia permisos o roles?
- ¿Afecta reportes?
- ¿Afecta integración externa?
- ¿Debe conservar historial anterior?
- ¿Quién lo aprueba?
- ¿Cómo se sabrá que ya quedó aceptado?

### Paso 3. Artefactos afectados

Usar tarjetas con contadores:

- Pantallas.
- Endpoints/lógica.
- Tablas.
- Reportes.
- Roles/permisos.
- Integraciones.
- Pruebas.
- Documentación.

### Paso 4. Resultado

Mostrar:

- Tipo sugerido.
- Horas optimista/probable/conservador.
- Costo estimado.
- Impacto en días.
- Riesgo.
- Si entra en garantía o nuevo alcance.
- Explicación breve.

### Paso 5. Decisión

Botones:

- Aprobar cambio.
- Rechazar.
- Diferir.
- Pedir aclaración.
- Convertir a nuevo alcance.

## 3. Lenguaje recomendado

Evitar mensajes técnicos largos. Usar frases como:

- "Este cambio parece sencillo, pero modifica datos y permisos".
- "No conviene aceptarlo sin autorización porque cambia la línea base".
- "Puede hacerse rápido en pantalla, pero requiere pruebas de flujo completo".
- "Si se aprueba, el proyecto aumenta aproximadamente X días".

## 4. Reporte municipal

Agregar una sección al reporte municipal:

```text
Cambios solicitados y su impacto
```

Columnas:

- Fecha.
- Solicitud original.
- Tipo.
- Decisión.
- Costo.
- Días.
- Riesgo.
- Responsable de aprobación.

## 5. Reporte proveedor

Agregar:

- Cambios absorbidos sin cobro.
- Cambios aprobados como nuevo alcance.
- Cambios pendientes de aclaración.
- Impacto total en flujo de efectivo.
