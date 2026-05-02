import { z } from "zod";

export const projectCreateSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  client: z.string().min(2),
  clientType: z.enum(["municipal", "paramunicipal", "externo"]).default("municipal"),
  municipalArea: z.string().min(2),
  objective: z.string().min(5),
  systemType: z.string().min(2),
  responsible: z.string().optional(),
  estimatedBudget: z.number().nullable().optional(),
  targetDate: z.string().datetime().optional().nullable(),
  priority: z.enum(["baja", "media", "alta", "critica"]).default("media"),
  notes: z.string().optional(),
});

export const projectUpdateSchema = projectCreateSchema.partial().extend({
  status: z.enum(["borrador", "captura", "estimado", "aprobado", "en_ejecucion", "cerrado", "archivado"]).optional(),
});

export const moduleCreateSchema = z.object({
  name: z.string().min(2),
  type: z.string().default("transaccional"),
  description: z.string().optional(),
  complexity: z.number().int().min(1).max(5),
  clarity: z.number().int().min(1).max(5),
  criticality: z.number().int().min(1).max(5),
  screensCount: z.number().int().min(0).default(0),
  reportsCount: z.number().int().min(0).default(0),
  catalogsCount: z.number().int().min(0).default(0),
  integrationsCount: z.number().int().min(0).default(0),
  rolesPermissions: z.string().optional(),
  sensitiveData: z.boolean().default(false),
  notes: z.string().optional(),
});

export const storyCreateSchema = z.object({
  actor: z.string().min(2),
  need: z.string().min(5),
  benefit: z.string().min(5),
  rules: z.string().optional(),
  dataRequired: z.string().optional(),
  acceptanceCriteria: z.string().optional(),
  evidenceExpected: z.string().optional(),
  maturityLevel: z.number().int().min(1).max(5).default(1),
  risks: z.string().optional(),
  priority: z.enum(["baja", "media", "alta", "critica"]).default("media"),
});

export const teamProfileCreateSchema = z.object({
  name: z.string().min(2),
  role: z.string().min(2),
  level: z.enum(["junior", "mid", "senior", "lead"]).default("mid"),
  monthlySalary: z.number().min(0),
  hourlyCost: z.number().min(0).optional().nullable(),
  availabilityPercent: z.number().int().min(0).max(100).default(100),
  monthsAssigned: z.number().min(0).default(1),
  contractType: z.enum(["asimilados", "honorarios", "nomina", "resico_pf", "freelance"]).default("nomina"),
  productivityFactor: z.number().min(0).max(2).default(1.0),
  turnoverRisk: z.number().int().min(1).max(5).default(2),
  supervisionRequired: z.number().int().min(1).max(5).default(2),
  notes: z.string().optional(),
});

export const estimateRequestSchema = z.object({
  mode: z.enum(["traditional", "ai_assisted", "bytecoding_prompts", "low_code", "hybrid"]),
  scenarios: z.array(z.enum(["optimistic", "probable", "conservative"])).optional(),
  targetMargin: z.number().min(0).max(0.99).default(0.20),
  weeklyTeamCapacityHours: z.number().min(1).default(80),
  costMode: z.enum(["detailed", "estimated"]).default("detailed"),
  cashFlowAssumptions: z
    .object({
      anticipoPct: z.number().min(0).max(1).default(0.30),
      finalPaymentPct: z.number().min(0).max(1).default(0.30),
      durationMonths: z.number().int().min(1).default(3),
      monthlyToolsCost: z.number().min(0).default(0),
      monthlyAdminCost: z.number().min(0).default(0),
    })
    .optional(),
  capitalDeclaredByProvider: z.number().min(0).optional(),
});

export const changeRequestCreateSchema = z.object({
  moduleId: z.string().optional().nullable(),
  requesterName: z.string().min(2),
  description: z.string().min(5),
  type: z.enum(["correccion", "garantia", "ajuste_menor", "mejora", "nuevo_alcance"]),
  reason: z.string().optional(),
  timeImpactHours: z.number().min(0).optional(),
  costImpact: z.number().min(0).optional(),
  testingImpact: z.string().optional(),
  trainingImpact: z.string().optional(),
  documentationImpact: z.string().optional(),
});

export const changeRequestUpdateSchema = changeRequestCreateSchema.partial().extend({
  decision: z.enum(["pendiente", "aceptado", "rechazado", "incluido"]).optional(),
  decidedBy: z.string().optional(),
});
