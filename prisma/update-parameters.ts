/**
 * Actualiza SOLO los parámetros fiscales/laborales desde
 * 17_seed_data_parametros_2026.json, sin tocar proyectos, equipos,
 * estimaciones ni datos de usuarios.
 *
 * Para qué sirve: cuando cambian valores oficiales (UMA, salario mínimo,
 * cuotas) o se corrige el catálogo, hay que llevar esos valores a una base
 * que YA tiene datos reales. Correr el seed completo también funcionaría,
 * pero toca más cosas de las necesarias; esto es el mínimo indispensable.
 *
 * Es idempotente (usa upsert con la llave única año+país+estado+clave+vigencia)
 * y muestra qué cambió, para dejar evidencia de la actualización.
 *
 * Uso: npx tsx prisma/update-parameters.ts
 */
import { PrismaClient } from "@prisma/client";
import seedData from "../17_seed_data_parametros_2026.json";
import parameterManualsData from "../46_parameter_manuals_2026.json";

const prisma = new PrismaClient();

type SeedParam = {
  key: string;
  value: number | string | null;
  unit: string;
  base?: string;
  source: string;
  source_url?: string;
  effective_from: string;
  effective_until?: string;
  notes?: string;
  table?: Record<string, unknown>;
};

async function main() {
  const year = seedData.year;
  const country = seedData.country;
  const state = seedData.state;
  const cambios: string[] = [];
  let nuevos = 0;

  for (const p of seedData.parameters as SeedParam[]) {
    const valueStr =
      p.value === null && p.table
        ? JSON.stringify(p.table)
        : p.value !== null
          ? String(p.value)
          : null;

    const where = {
      year_country_state_key_effectiveFrom: {
        year,
        country,
        state,
        key: p.key,
        effectiveFrom: new Date(p.effective_from),
      },
    };

    const antes = await prisma.parameter.findUnique({ where });
    await prisma.parameter.upsert({
      where,
      update: {
        value: valueStr,
        unit: p.unit,
        base: p.base ?? null,
        source: p.source,
        sourceUrl: p.source_url ?? null,
        effectiveUntil: p.effective_until ? new Date(p.effective_until) : null,
        notes: p.notes ?? null,
      },
      create: {
        year,
        country,
        state,
        key: p.key,
        value: valueStr,
        unit: p.unit,
        base: p.base ?? null,
        source: p.source,
        sourceUrl: p.source_url ?? null,
        effectiveFrom: new Date(p.effective_from),
        effectiveUntil: p.effective_until ? new Date(p.effective_until) : null,
        notes: p.notes ?? null,
      },
    });

    if (!antes) {
      nuevos += 1;
      cambios.push(`NUEVO  ${p.key} = ${String(valueStr).slice(0, 60)}`);
    } else if (antes.value !== valueStr) {
      cambios.push(`CAMBIO ${p.key}: ${String(antes.value).slice(0, 40)} -> ${String(valueStr).slice(0, 40)}`);
    }
  }

  // Bloques JSON del motor (mismos que el seed completo). Los que traen `desde` y
  // `fuente` son precios con fecha de consulta: se guardan con esa vigencia y esa fuente.
  const FUENTE_SEPTIEMBRE =
    "Investigacion en internet del 09-sep-2026: paginas de precios oficiales y estudios publicados (ver fuentes dentro del valor)";
  const jsonBlocks: Array<{ key: string; data: unknown; notes: string; desde?: string; fuente?: string }> = [
    { key: "DEV_MODE_FACTORS", data: seedData.development_mode_factors, notes: "Coeficientes de distribucion por fase para cada modo." },
    { key: "DEV_MODE_VELOCITY", data: seedData.development_mode_velocity, notes: "Velocidad calendario y aceleracion a prototipo por modo." },
    { key: "SCENARIO_FACTORS", data: seedData.scenario_factors, notes: "Factores optimista/probable/conservador para escenarios." },
    { key: "DEFAULT_CARGA_PATRONAL_ESTIMADA", data: seedData.default_carga_patronal_estimada, notes: "Factor agregado para modo 'estimado'." },
    {
      key: "AI_TOOL_COSTS",
      data: seedData.ai_tool_costs,
      notes: "Costo mensual de herramientas de IA por persona tecnica y por forma de hacerlo, USD sin IVA. Precios consultados el 13-oct-2026; fuentes en el JSON.",
      desde: "2026-10-13",
      fuente: "Páginas de precios consultadas el 13 de octubre de 2026: Anthropic, Cursor, GitHub Copilot, OpenAI, Google Gemini",
    },
    {
      key: "AI_SKILL_FACTORS",
      data: seedData.ai_skill_factors,
      notes: "Parte de la ganancia nominal de cada modo que se acredita segun la pericia del equipo con la IA (1 a 5).",
      desde: "2026-09-09",
      fuente: FUENTE_SEPTIEMBRE,
    },
  ];
  for (const { key, data, notes, desde, fuente } of jsonBlocks) {
    if (data === undefined) continue;
    const effectiveFrom = new Date(desde ?? `${year}-01-01`);
    const where = {
      year_country_state_key_effectiveFrom: {
        year, country, state, key, effectiveFrom,
      },
    };
    const valueStr = JSON.stringify(data);
    const antes = await prisma.parameter.findUnique({ where });
    await prisma.parameter.upsert({
      where,
      // Los precios con fecha tambien actualizan su fuente y su nota, para que correr el script otra vez deje todo igual.
      update: desde ? { value: valueStr, source: fuente, notes } : { value: valueStr },
      create: {
        year, country, state, key,
        value: valueStr,
        unit: "json",
        source: desde ? (fuente ?? FUENTE_SEPTIEMBRE) : "EMPS Fresnillo internal",
        effectiveFrom,
        notes,
      },
    });
    if (!antes) { nuevos += 1; cambios.push(`NUEVO  ${key} (json)`); }
    else if (antes.value !== valueStr) cambios.push(`CAMBIO ${key} (json)`);

    // Un precio con una fecha nueva no borra el anterior: lo cierra el dia antes, para
    // que quede la historia y la base solo use la version vigente (ver loadAllForYear).
    if (desde) {
      const cierre = new Date(effectiveFrom.getTime() - 24 * 60 * 60 * 1000);
      const cerradas = await prisma.parameter.updateMany({
        where: { year, country, state, key, effectiveFrom: { lt: effectiveFrom }, effectiveUntil: null },
        data: { effectiveUntil: cierre },
      });
      if (cerradas.count > 0) cambios.push(`CERRADO ${key}: ${cerradas.count} version(es) anterior(es) hasta el ${cierre.toISOString().slice(0, 10)}`);
    }
  }

  // Manuales de los parametros que cambiaron de fecha (el texto que se ve en el cajon de informacion).
  const manuales = parameterManualsData.manuals as Record<string, {
    title: string;
    originSource?: string;
    originUrl?: string;
    originDocument?: string;
    whatItAffects?: string;
    howToModify?: string;
    referencesMarkdown?: string;
    sourceTrustLevel?: string;
    lastReviewedAt?: string;
  }>;
  for (const key of ["AI_TOOL_COSTS"]) {
    const m = manuales[key];
    if (!m) continue;
    const datos = {
      title: m.title,
      originSource: m.originSource ?? null,
      originUrl: m.originUrl ?? null,
      originDocument: m.originDocument ?? null,
      whatItAffects: m.whatItAffects ?? null,
      howToModify: m.howToModify ?? null,
      referencesMarkdown: m.referencesMarkdown ?? null,
      sourceTrustLevel: m.sourceTrustLevel ?? "oficial",
      lastReviewedAt: m.lastReviewedAt ? new Date(m.lastReviewedAt) : null,
    };
    const antes = await prisma.parameterManual.findUnique({ where: { parameterKey: key } });
    await prisma.parameterManual.upsert({ where: { parameterKey: key }, create: { parameterKey: key, ...datos }, update: datos });
    if (!antes) cambios.push(`NUEVO  manual de ${key}`);
    else if (antes.whatItAffects !== datos.whatItAffects || antes.originSource !== datos.originSource) cambios.push(`CAMBIO manual de ${key}`);
  }

  const total = await prisma.parameter.count();
  console.log(`Parámetros en la base: ${total} (nuevos en esta corrida: ${nuevos})`);
  if (cambios.length === 0) {
    console.log("Sin cambios: la base ya estaba al día.");
  } else {
    console.log(`Cambios aplicados: ${cambios.length}`);
    for (const c of cambios) console.log("  " + c);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
