# Instrucciones para agentes/proyectos externos que modifiquen EMPS

Si vas a hacer mejoras a este sistema (EMPS-Fresnillo / EstimacionTemprana),
LEE ESTO COMPLETO ANTES DE TOCAR CÓDIGO. Aquí está lo que ya existe, las
reglas que no se negocian y los procedimientos exactos.

---

## 1. Qué es este sistema

Estimador Municipal de Proyectos de Software (tesis UAZ + producto operable).
Calcula esfuerzo, tiempo, costo con impuestos mexicanos (IMSS, ISN, IVA, ISR),
riesgo y flujo de efectivo para proyectos de software municipales, en 5 modos
de desarrollo × 3 escenarios. Usuarios finales: personal de ayuntamiento y
proveedores SIN formación técnica ni contable.

- Stack: Next.js 15 (App Router) + React 19 + TypeScript estricto + Prisma 6.
- Rama `main`: desarrollo local con SQLite (`DATABASE_URL` → `prisma/prisma/dev.db`, NO versionada).
- Rama `deploy/vps-mariadb`: producción con MySQL/MariaDB (schema con `@db.Text`).
- Producción: https://estimacion.hazlatarea.com (VPS OVH, servicio systemd
  `estimacion-fresnillo`, puerto interno 127.0.0.1:4001).

## 2. REGLAS QUE NO SE NEGOCIAN

1. **COMMITEA TU TRABAJO SIEMPRE.** Trabajo sin commit se ha perdido ya en
   cambios de rama. Commit chico y frecuente en `main`. No dejes archivos
   sueltos sin versionar (hoy `app/api/chatbot-quote/` está pendiente de
   commit por otra sesión: si es tuyo, commitéalo).
2. **NO subas secretos.** `MANUAL_MODO_INVESTIGADOR.md`, `.env` y las bases
   `.db` están en `.gitignore` a propósito. No los agregues con `git add -f`.
3. **En el VPS, trabaja SOLO en lo de este proyecto**: `/opt/estimacion-fresnillo`,
   servicio `estimacion-fresnillo`, BD `c01uukzjf84a_estimacion`, subdominio
   estimacion.hazlatarea.com. NO toques hazlatarea (:4000), rosbecloud (:4003),
   traductor (:4002), WordPress ni otras bases.
4. **Cambios de schema: solo ADITIVOS** (`prisma db push` sin pérdida). Los
   `Estimate` son historial inmutable: nunca update/delete de estimaciones.
5. **No degradar el aislamiento por workspace**: cada visitante (cookie
   `emps_workspace_id`) solo ve sus proyectos. La página de detalle y las APIs
   devuelven 404 si el proyecto es de otro workspace. Cualquier vista/endpoint
   nuevo debe respetar ese patrón (ver `app/api/projects/[id]/decision/route.ts`).
6. **Lecturas NO crean workspace**: en vistas/GET usa `peekWorkspace()` de
   `lib/workspace.ts` (devuelve null si no hay fila). `getCurrentWorkspace()`
   (que sí crea la fila) es SOLO para escrituras. Si lo inviertes, el panel del
   investigador se llena de sesiones vacías otra vez.

## 3. Estándares de entendibilidad YA establecidos (síguelos, no los reinventes)

El sistema ya pasó una auditoría de UX y tiene estas convenciones:

- **Lenguaje**: español mexicano llano. CERO jerga de programador en la UI
  ("schema", "motor v7", "guardrail", "descomposición funcional" están
  prohibidos). CERO valores crudos de BD en pantalla ("en_ejecucion",
  "crud_interno", "optimistic"): usa los mapas de `lib/utils.ts`
  (`STATUS_LABELS`, `SYSTEM_TYPE_LABELS`, `CONTRACT_LABELS`, `LEVEL_LABELS`,
  `ROLE_LABELS`, `SCENARIO_LABELS`, `MODULE_TYPE_LABELS`, helper `labelOf()`).
- **Toda cifra explica su origen**: patrón "Operación" (la suma escrita:
  "$X + $Y = $Z") en tablas, `components/info-tip.tsx` (ⓘ "¿De dónde sale
  este número?") en pantalla, y notas de origen VISIBLES (no tooltip) en los
  reportes porque se imprimen.
- **Ayuda DONDE SE CAPTURA**: cada campo de formulario lleva helper text bajo
  el campo (escalas 1-5 explicadas con `SCALE_GUIDES`, contratos con
  `CONTRACT_HELP`, placeholders con ejemplo). El modelo a imitar es
  `app/projects/[id]/estimate/page.tsx`.
- **Perspectiva explícita**: siempre decir DESDE QUIÉN habla una cifra
  (proveedor cobra/paga vs ayuntamiento paga). Banner de perspectiva en el
  detalle; reportes separados por audiencia.
- **Glosario conectado**: si usas un término en pantalla, debe existir en
  `app/glossary/page.tsx` con definición llana (sin definir jerga con jerga,
  sin citar archivos internos).
- **Identidad**: se dice "tu cuenta/llave" y "galletita (cookie)", nunca
  "workspace" al usuario.

## 4. Qué ya está construido (no lo dupliques ni lo deshagas)

- Motor de estimación (`lib/engine/`), control de cambios con wizard de
  impacto de 6 pasos, reportes municipal/proveedor/académico, flujo de caja
  con columna Operación, 54 manuales de parámetros (ⓘ en /admin/parametros),
  overrides de parámetros por workspace ("solo te afecta a ti").
- **Recomendación por rol** (`lib/engine/recommendation.ts`, función pura,
  reglas explicables): tarjeta "¿Cuál opción te conviene?" en el proyecto y
  recomendación real en el reporte municipal. NO le metas ML ni cambies los
  pesos sin hablar con el dueño.
- **Decisión registrada** (`ProjectDecision` en Prisma, histórico con
  `supersededAt`): botón "Elegir esta opción", sección "Tu decisión y lo que
  pasó después" (delta contra hoy + cronología de modificaciones vía
  `WorkspaceActivityLog`).
- Zona de investigación (`/investigacion`, protegida con clave admin): panel
  de datos, validación de hipótesis, exportaciones CSV. Los eventos
  (`option_chosen`, `estimate_run`, `module_updated`, etc.) alimentan la
  tesis del dueño: NO renombres eventTypes existentes.

## 5. Cómo verificar (obligatorio antes de dar por buena una mejora)

```powershell
npx tsc --noEmit      # debe salir limpio
npm run build         # debe compilar
npm run dev           # probar el flujo tocado en el navegador
npx vitest run        # si tocaste el motor (lib/engine)
```
Y greps de fugas: "motor v7", "guardrail", "schema", "optimistic" no deben
aparecer en JSX visible al usuario.

## 6. Cómo se despliega a producción (procedimiento probado)

1. Commit en `main` → cherry-pick a `deploy/vps-mariadb` → push de ambas.
2. Si tocaste `prisma/schema.prisma`: en la rama deploy los campos String
   largos llevan `@db.Text` (patrón `scripts/fix-schema-mysql.py`).
3. En el VPS (ssh almalinux@51.222.204.69):
   - Empaquetar SOLO los archivos cambiados (`git archive`) → scp → extraer
     en `/opt/estimacion-fresnillo` → `chown -R estimacion:estimacion`.
   - Si hubo schema: `npx prisma db push` + `npx prisma generate`
     (como usuario `estimacion`) ANTES del build.
   - `npm run build` (usuario `estimacion`, PATH de
     `/opt/cpanel/ea-nodejs20/bin`) → copiar `public` y `.next/static` a
     `.next/standalone/` → `sudo systemctl restart estimacion-fresnillo`.
   - Smoke: `curl -H "Host: estimacion.hazlatarea.com" http://127.0.0.1:4001/`
     debe dar 200; `curl http://127.0.0.1:4000/api/health` (hazlatarea,
     ajeno) debe seguir dando 200.
4. El servicio tiene `Restart=always` y `Wants=mariadb.service` (NO lo
   regreses a `Requires`: eso lo mataba en el mantenimiento nocturno).

## 7. Si algo no cuadra

- La historia completa de decisiones técnicas está en los mensajes de commit
  (`git log`) y en `MANUAL.md`.
- Ante duda entre "rehacer" y "extender lo que hay": EXTENDER. El dueño
  valora consistencia sobre novedad.
