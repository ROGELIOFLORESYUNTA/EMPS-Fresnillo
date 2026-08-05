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

  // Bloques JSON del motor (mismos que el seed completo)
  const jsonBlocks: Array<[string, unknown, string]> = [
    ["DEV_MODE_FACTORS", seedData.development_mode_factors, "Coeficientes de distribucion por fase para cada modo."],
    ["DEV_MODE_VELOCITY", seedData.development_mode_velocity, "Velocidad calendario y aceleracion a prototipo por modo."],
    ["SCENARIO_FACTORS", seedData.scenario_factors, "Factores optimista/probable/conservador para escenarios."],
    ["DEFAULT_CARGA_PATRONAL_ESTIMADA", seedData.default_carga_patronal_estimada, "Factor agregado para modo 'estimado'."],
  ];
  for (const [key, data, notes] of jsonBlocks) {
    if (data === undefined) continue;
    const where = {
      year_country_state_key_effectiveFrom: {
        year, country, state, key, effectiveFrom: new Date(`${year}-01-01`),
      },
    };
    const valueStr = JSON.stringify(data);
    const antes = await prisma.parameter.findUnique({ where });
    await prisma.parameter.upsert({
      where,
      update: { value: valueStr },
      create: {
        year, country, state, key,
        value: valueStr,
        unit: "json",
        source: "EMPS Fresnillo internal",
        effectiveFrom: new Date(`${year}-01-01`),
        notes,
      },
    });
    if (!antes) { nuevos += 1; cambios.push(`NUEVO  ${key} (json)`); }
    else if (antes.value !== valueStr) cambios.push(`CAMBIO ${key} (json)`);
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
