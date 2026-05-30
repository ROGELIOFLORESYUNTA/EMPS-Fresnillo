/**
 * Migración aditiva v7: recalcula los ChangeImpactAssessment existentes
 * para poblar los 11 campos nuevos del addendum v7.
 *
 * Es idempotente: si ya tienen los campos v7, los reescribe con valores
 * frescos usando los parámetros vigentes en Parameter.
 *
 * Run:  npx tsx prisma/migrate-v7-assessments.ts
 */
import { PrismaClient } from "@prisma/client";
import { computeChangeImpact } from "../lib/engine/change-impact";
import { loadChangeImpactParameters } from "../lib/parameters";
import type {
  ChangeImpactInput,
  AffectedArtifactInput,
  ChangePhase,
  ChangeDevelopmentMode,
} from "../lib/engine/change-types";

const prisma = new PrismaClient();

async function main() {
  console.log("Cargando parámetros v7 desde Parameter...");
  const params = await loadChangeImpactParameters(2026, "Zacatecas");
  console.log(`  - Claves cargadas: ${params.loadedKeys.length}`);
  console.log(`  - Fallbacks: ${params.fallbackWarnings.length}`);
  if (params.fallbackWarnings.length > 0) {
    for (const w of params.fallbackWarnings) console.warn(`    ! ${w}`);
  }

  const assessments = await prisma.changeImpactAssessment.findMany({
    orderBy: { createdAt: "asc" },
  });
  console.log(`\nProcesando ${assessments.length} assessment(s) existente(s)...`);

  let updated = 0;
  let skipped = 0;

  for (const a of assessments) {
    try {
      const artifacts = JSON.parse(a.affectedArtifactsJson) as AffectedArtifactInput;
      const input: ChangeImpactInput = {
        projectId: a.projectId,
        changeRequestId: a.changeRequestId ?? undefined,
        originalText: a.originalText,
        currentPhase: a.currentPhase as ChangePhase,
        clarityLevel: a.clarityLevel as 1 | 2 | 3 | 4 | 5,
        urgencyLevel: a.urgencyLevel as 1 | 2 | 3 | 4 | 5,
        developmentMode: a.developmentMode as ChangeDevelopmentMode,
        affectedArtifacts: artifacts,
        securityImpact: 0, // no se persistió; default 0
        dataImpact: artifacts.databaseTables > 0 ? 1 : 0,
        integrationImpact: artifacts.externalIntegrations > 0 ? 1 : 0,
        testingRequired: artifacts.automatedTests > 0 || artifacts.manualTestScenarios > 0,
        clientAvailabilityRisk: 0.15,
      };

      const result = computeChangeImpact(input, params);

      await prisma.changeImpactAssessment.update({
        where: { id: a.id },
        data: {
          clientPlainExplanationJson: JSON.stringify(result.plainExplanationForClient ?? []),
          providerTechnicalJson: JSON.stringify(result.technicalExplanationForProvider ?? []),
          financialBreakdownJson: JSON.stringify(result.financialBreakdown ?? {}),
          legalReferencesJson: JSON.stringify(result.legalReferences ?? []),
          maintenanceImpactMonthly: result.maintenanceImpactMonthly ?? 0,
          minimumChargeApplied: result.minimumChargeApplied ?? false,
          freeChangeGuardrailReason: result.freeChangeGuardrailReason ?? null,
          sourceParameterKeysJson: JSON.stringify(result.parameterSourceKeys ?? []),
          lastParameterReviewAt: new Date(),
        },
      });

      console.log(`  ✓ ${a.id}: ${a.suggestedType} (${a.riskLevel}) → MXN ${result.financialBreakdown?.totalInvoice.toFixed(0) ?? "—"}`);
      updated++;
    } catch (e) {
      console.error(`  ✗ ${a.id}: ${e instanceof Error ? e.message : e}`);
      skipped++;
    }
  }

  console.log(`\n=== Resumen ===`);
  console.log(`  Actualizados: ${updated}`);
  console.log(`  Omitidos:     ${skipped}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
