# Prompt técnico: cómo integrar RosbeCloud con el sistema de estimación EMPS

Este documento es para dárselo a quien trabaje en **RosbeCloud** (o a su IA). Explica qué es
EMPS, dónde vive (local y en OVH), su arquitectura, y el contrato exacto para que el chatbot de
RosbeCloud le pida una estimación y se la muestre al cliente.

---

## 1. Qué es EMPS y para qué sirve en esta integración

EMPS (Estimador Municipal de Proyectos de Software) es una app que, a partir de la descripción de
un proyecto de software, calcula **esfuerzo (horas), tiempo (semanas), costo y precio con impuestos,
nivel de riesgo y flujo de caja**, para 5 modos de desarrollo y 3 escenarios (optimista / probable /
conservador). Es del mismo dueño que RosbeCloud.

**Objetivo de la integración:** cuando un cliente en el chatbot de RosbeCloud describe lo que
necesita ("quiero un sistema para administrar X, con estos módulos..."), el chatbot manda esos datos
a EMPS, EMPS **corre la estimación** y devuelve las cifras, y el chatbot se las presenta al cliente
como un aproximado inmediato, sin intervención humana.

---

## 2. Dónde vive EMPS

**Local (desarrollo):**
- Ruta: `C:\Users\USER\Documents\REPOSITORIO\EstimacionTemprana`
- Stack: Next.js 15 (App Router) + TypeScript + Prisma 6. Base local: SQLite (`prisma/dev.db`).
- Se corre con `npm run dev` (servidor local).

**Producción (OVH, MISMO VPS que RosbeCloud):**
- VPS OVHcloud, IP `51.222.204.69`, cPanel cuenta `c01uukzjf84a`, `ssh almalinux@51.222.204.69`.
- Servicio systemd: **`estimacion-fresnillo`**, escucha SOLO en **`127.0.0.1:4001`**.
- Código en `/opt/estimacion-fresnillo`, usuario de sistema `estimacion`, Node 20
  (`/opt/cpanel/ea-nodejs20/bin/node`), `.env` con permisos 600.
- Base de datos: **MariaDB** `c01uukzjf84a_estimacion` en `127.0.0.1:3306`.
- Apache hace reverse proxy COMPLETO (`/`) al puerto 4001.
- Dominio público: **`https://estimacion.hazlatarea.com`** (SSL Let's Encrypt / AutoSSL).
- Convive sin tocar: Haz la Tarea (:4000), RosbeCloud (:4003), Traductor (:4002).

**Dato clave para la integración:** como RosbeCloud (`127.0.0.1:4003`) y EMPS (`127.0.0.1:4001`)
están en la MISMA máquina, el backend de RosbeCloud puede llamar a EMPS **directo por red interna**
(`http://127.0.0.1:4001/...`), sin salir a internet: más rápido, privado y sin exponer nada público.

---

## 3. Arquitectura de EMPS (lo relevante para estimar)

- **El motor de cálculo** vive en `lib/engine/` como funciones PURAS sin efectos secundarios:
  `computeEffort`, `computeScenarios`, `computeCalendar`, `computeProfileCost`, `computePricing`,
  `computeISR`, `computeRisk`, `buildSimpleCashFlow`. Reciben módulos + equipo + parámetros
  fiscales/de modo y devuelven las cifras.
- **El servicio orquestador** `lib/estimate-service.ts` (`runEstimate`) junta esas piezas, PERO hoy
  **exige un proyecto ya guardado en la BD con módulos y equipo**, y persiste el resultado. Es
  pesado para un chatbot (requiere 4 llamadas HTTP: crear proyecto → módulos → equipo → estimar).
- **Los parámetros fiscales/de modo** (IVA, ISR, IMSS, factores de velocidad por modo, etc.) se
  cargan de la tabla `Parameter` con `loadAllForEstimate(year, workspaceId)` (`lib/parameters.ts`).

### Qué necesita el motor para estimar (entradas mínimas)
- **Módulos** (uno o varios), cada uno con: `complexity`, `clarity`, `criticality` (enteros 1-5), y
  opcionalmente conteos `screensCount`, `reportsCount`, `catalogsCount`, `integrationsCount`,
  `sensitiveData` (bool). Piso de 40 h por módulo.
- **Equipo**: al menos un perfil con `monthlySalary` (MXN) — es la base del costo.
- **Modo de desarrollo** (uno): `traditional | ai_assisted | bytecoding_prompts | low_code | hybrid`.
- **Escenarios**: por defecto los 3 (`optimistic | probable | conservative`).
- Opcionales con default: `targetMargin` (0.20), `weeklyTeamCapacityHours` (80).

### Qué devuelve (por cada modo × escenario)
`totalEffortHours`, `weeksTotal`, `weeksToPrototype`, `subtotal`, `vat` (IVA), `total` (precio final),
`isrEstimated`, `riskLevel` (bajo|medio|alto|critico), `riskScore`, y `workingCapitalRequired`
(capital de trabajo / bache de caja).

---

## 4. Cómo conectar el chatbot con EMPS (dos opciones)

### Opción A — RECOMENDADA: construir en EMPS un endpoint de "estimación rápida" sin guardar nada
Hoy **no existe**; hay que crearlo (es 1 archivo). Sería:

`POST http://127.0.0.1:4001/api/quick-estimate`  (interno) o `https://estimacion.hazlatarea.com/api/quick-estimate` (público)

Headers: `Content-Type: application/json` y `X-API-Key: <secreto compartido>` (a definir, ver §5).

Request (ejemplo):
```json
{
  "systemType": "portal_ciudadano",
  "mode": "hybrid",
  "scenarios": ["optimistic", "probable", "conservative"],
  "modules": [
    { "name": "Trámites", "complexity": 4, "clarity": 3, "criticality": 4,
      "screensCount": 6, "reportsCount": 2, "integrationsCount": 1, "sensitiveData": true }
  ],
  "team": [ { "role": "Full-stack", "monthlySalary": 30000 } ],
  "targetMargin": 0.20,
  "weeklyTeamCapacityHours": 80
}
```

Response (ejemplo):
```json
{
  "results": [
    { "mode": "hybrid", "scenario": "probable",
      "totalEffortHours": 640, "weeksTotal": 9,
      "subtotal": 210000, "vat": 33600, "total": 243600,
      "riskLevel": "medio", "riskScore": 0.42,
      "workingCapitalRequired": 85000 }
  ],
  "currency": "MXN",
  "disclaimer": "Aproximado automático; sujeto a validación."
}
```
Este endpoint reutiliza las funciones PURAS de `lib/engine/` + `loadAllForEstimate()` y NO escribe en
la base (no crea proyecto). Es rápido e idempotente, ideal para un chatbot. (En el lado de EMPS, el
cuerpo de `lib/estimate-service.ts` sirve de referencia para armar las piezas, quitando los `prisma.*`.)

### Opción B — interina, sin cambiar EMPS: encadenar los 4 endpoints que YA existen
`POST /api/projects` → `POST /api/projects/{id}/modules` → `POST /api/projects/{id}/team` →
`POST /api/projects/{id}/estimate`. Devuelve las mismas cifras, pero crea un proyecto real en la BD
por cada consulta (ensucia datos) y requiere mandar el header `Cookie: emps_workspace_id=<id fijo>`
en la creación. Sirve para un prototipo rápido, pero para producción es mejor la Opción A.

### Dónde se engancha en RosbeCloud
El chatbot ya tiene un bucle de herramientas server-side. Se agrega **una 4ª tool** en
`lib/chat/tools.ts`:
1. En `CHAT_TOOLS`: una herramienta `estimar_proyecto` con `input_schema` = los campos del request
   de arriba (módulos, modo, equipo).
2. En `runTool()`: una rama `if (name === "estimar_proyecto")` que hace
   `fetch("http://127.0.0.1:4001/api/quick-estimate", { method:"POST", headers, body })` y devuelve
   el texto con las cifras. El cerebro (`lib/chat/brain.ts`) reinyecta el resultado y Claude redacta
   la respuesta al cliente. Funciona igual en web y WhatsApp porque ambos usan `generateReply()`.

La API key va en el `.env`/`lib/config.ts` de RosbeCloud (nunca en el navegador).

---

## 5. Seguridad de la llamada (importante)
Hoy los endpoints de estimación de EMPS **no tienen autenticación** (opera sin login). Para esta
integración server-to-server:
- Llamar por **red interna** `http://127.0.0.1:4001` (no expone nada a internet).
- Agregar en EMPS al nuevo `/api/quick-estimate` una verificación de header **`X-API-Key`** contra un
  secreto guardado en el `.env` de EMPS, y que RosbeCloud lo mande. Así solo RosbeCloud puede
  consumirlo. Añadir rate-limiting básico.

---

## 6. Resumen para el que reciba esto
- EMPS es una app Next.js/Prisma en el mismo VPS (`127.0.0.1:4001`, `estimacion.hazlatarea.com`) que
  convierte "descripción de proyecto" en "horas, semanas, costo, precio con IVA y riesgo".
- La forma limpia de integrarlo con el chatbot: crear en EMPS `POST /api/quick-estimate` (estimación
  sin persistir, protegida con API key) y consumirlo desde una nueva tool `estimar_proyecto` en
  `lib/chat/tools.ts` de RosbeCloud, llamando por red interna del VPS.
- El contrato de datos (request/response) está en §4. Las entradas mínimas y su significado, en §3.
