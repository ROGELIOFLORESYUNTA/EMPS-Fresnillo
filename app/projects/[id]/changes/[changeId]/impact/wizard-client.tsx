"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Monitor, Database, ShieldCheck, FileBarChart, KeySquare, Zap, FlaskConical, GraduationCap, FileText, AlertTriangle, ChevronLeft, ChevronRight, Download, Calculator, CheckCircle2, XCircle, Clock, HelpCircle } from "lucide-react";
import { apiPost } from "@/lib/api-client";
import { formatMXN } from "@/lib/utils";
import type {
  ChangeImpactInput,
  ChangeImpactResult,
  AffectedArtifactInput,
  ChangePhase,
  ChangeDevelopmentMode,
} from "@/lib/engine/change-types";

const PHASE_LABELS: Record<ChangePhase, string> = {
  before_baseline: "Antes de la línea base (planeación)",
  after_baseline: "Después de la línea base, antes de desarrollar",
  in_development: "En desarrollo",
  after_integration: "Después de integración",
  after_testing: "Después de pruebas",
  after_acceptance: "Después de aceptación del cliente",
  in_production: "Ya en producción",
};

const MODE_LABELS: Record<ChangeDevelopmentMode, string> = {
  traditional: "Tradicional",
  ai_assisted: "Asistido por IA",
  hybrid: "Híbrido",
  bytecoding_prompts: "Bytecoding (prompts)",
  low_code: "Low-code",
};

const ARTIFACT_DEFS: { key: keyof AffectedArtifactInput; label: string; icon: React.ReactNode; description: string }[] = [
  { key: "uiScreens", label: "Pantallas", icon: <Monitor className="w-5 h-5" />, description: "Nuevas pantallas o cambios visibles al usuario." },
  { key: "apiEndpoints", label: "Endpoints / API", icon: <Zap className="w-5 h-5" />, description: "Servicios nuevos o que cambian comportamiento." },
  { key: "businessRules", label: "Reglas de negocio", icon: <ShieldCheck className="w-5 h-5" />, description: "Lógica que decide qué se permite, calcula o valida." },
  { key: "databaseTables", label: "Tablas de base de datos", icon: <Database className="w-5 h-5" />, description: "Nuevos datos a guardar o tablas modificadas." },
  { key: "reports", label: "Reportes", icon: <FileBarChart className="w-5 h-5" />, description: "Reportes nuevos o que cambian columnas." },
  { key: "rolesPermissions", label: "Roles y permisos", icon: <KeySquare className="w-5 h-5" />, description: "Quién puede ver/usar la nueva función." },
  { key: "externalIntegrations", label: "Integraciones externas", icon: <Zap className="w-5 h-5" />, description: "Sistemas de terceros (bancos, SAT, etc.)." },
  { key: "dataMigrationObjects", label: "Migración de datos", icon: <Database className="w-5 h-5" />, description: "Mover datos viejos a nuevas estructuras." },
  { key: "automatedTests", label: "Pruebas automatizadas", icon: <FlaskConical className="w-5 h-5" />, description: "Tests que se deben crear o actualizar." },
  { key: "manualTestScenarios", label: "Pruebas manuales", icon: <FlaskConical className="w-5 h-5" />, description: "Escenarios a probar a mano." },
  { key: "documentsOrTrainingItems", label: "Documentación / capacitación", icon: <GraduationCap className="w-5 h-5" />, description: "Manuales, guías o sesiones para usuarios." },
];

const EMPTY_ARTIFACTS: AffectedArtifactInput = {
  uiScreens: 0, apiEndpoints: 0, businessRules: 0, databaseTables: 0, reports: 0, rolesPermissions: 0,
  externalIntegrations: 0, dataMigrationObjects: 0, automatedTests: 0, manualTestScenarios: 0, documentsOrTrainingItems: 0,
};

type DecisionStatus = "approved" | "rejected" | "deferred" | "requires_clarification" | "scope_increase";

interface WizardProps {
  projectId: string;
  changeId: string;
  initialDescription: string;
  existingAssessmentJson: string | null;
}

export function ImpactWizardClient({ projectId, changeId, initialDescription, existingAssessmentJson }: WizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [originalText, setOriginalText] = useState(initialDescription);
  const [currentPhase, setCurrentPhase] = useState<ChangePhase>("in_development");
  const [clarityLevel, setClarityLevel] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [urgencyLevel, setUrgencyLevel] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [developmentMode, setDevelopmentMode] = useState<ChangeDevelopmentMode>("hybrid");
  const [artifacts, setArtifacts] = useState<AffectedArtifactInput>(EMPTY_ARTIFACTS);
  const [securityImpact, setSecurityImpact] = useState<0 | 1 | 2 | 3>(0);
  const [dataImpact, setDataImpact] = useState<0 | 1 | 2 | 3>(0);
  const [integrationImpact, setIntegrationImpact] = useState<0 | 1 | 2 | 3>(0);
  const [previewResult, setPreviewResult] = useState<ChangeImpactResult | null>(null);
  const [previewWarnings, setPreviewWarnings] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [decision, setDecision] = useState<DecisionStatus | null>(null);
  const [decisionComment, setDecisionComment] = useState("");
  const [decisionUser, setDecisionUser] = useState("");

  const buildInput = (): ChangeImpactInput => ({
    projectId,
    changeRequestId: changeId,
    originalText,
    currentPhase,
    clarityLevel,
    urgencyLevel,
    developmentMode,
    affectedArtifacts: artifacts,
    securityImpact,
    dataImpact,
    integrationImpact,
    testingRequired: artifacts.automatedTests > 0 || artifacts.manualTestScenarios > 0,
    clientAvailabilityRisk: 0.15,
  });

  async function runPreview() {
    setLoading(true);
    setError(null);
    try {
      const res = await apiPost<{ result: ChangeImpactResult; warnings: string[] }>(
        `/api/projects/${projectId}/changes/preview`,
        buildInput(),
      );
      setPreviewResult(res.result);
      setPreviewWarnings(res.warnings ?? []);
      setStep(4);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al calcular impacto");
    } finally {
      setLoading(false);
    }
  }

  async function applyDecision() {
    if (!decision) return;
    if (!decisionUser.trim()) {
      setError("Indica quién autoriza esta decisión.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // 1. Persistir el cálculo
      await apiPost(`/api/projects/${projectId}/changes/${changeId}/impact`, buildInput());
      // 2. Aplicar la decisión
      await apiPost(`/api/projects/${projectId}/changes/${changeId}/decision`, {
        status: decision,
        comment: decisionComment,
        decidedBy: decisionUser,
      });
      router.push(`/projects/${projectId}/changes`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al aplicar decisión");
    } finally {
      setLoading(false);
    }
  }

  const totalArtifacts = useMemo(
    () => Object.values(artifacts).reduce((sum, v) => sum + v, 0),
    [artifacts],
  );
  const guardrailReason = previewResult?.freeChangeGuardrailReason ?? null;
  const decisionDisabled = decision === null || loading;
  const freeChangeDisabled = guardrailReason !== null;

  return (
    <div className="space-y-4">
      {existingAssessmentJson && (
        <div className="border-l-4 border-blue-400 bg-blue-50/50 rounded-md p-3 text-sm">
          <p>
            <strong>Hay una evaluación previa</strong> para este cambio. Si avanzas hasta el paso 6 y aplicas decisión, se sobrescribe.
            <Link href={`/projects/${projectId}/changes`} className="ml-2 text-primary hover:underline">
              Volver a la lista
            </Link>
          </p>
        </div>
      )}

      <Stepper currentStep={step} />

      {error && (
        <div className="border border-destructive bg-destructive/10 text-destructive rounded-md p-3 text-sm flex items-start gap-2">
          <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {step === 1 && (
        <StepCard title="Paso 1. Solicitud original" description="Copia lo que el cliente pidió en sus propias palabras.">
          <Textarea
            value={originalText}
            onChange={(e) => setOriginalText(e.target.value)}
            rows={6}
            placeholder='Ejemplo: "Quieren agregar un botón para que el director autorice el trámite y salga en el reporte mensual."'
            className="font-medium"
          />
          <p className="text-xs text-muted-foreground mt-2">Mínimo 10 caracteres. La forma en que el cliente lo describe ayuda a detectar si la solicitud es clara o vaga.</p>
          <NavButtons
            onNext={() => setStep(2)}
            disableNext={originalText.trim().length < 10}
          />
        </StepCard>
      )}

      {step === 2 && (
        <StepCard title="Paso 2. Contexto y claridad" description="Información que el motor usa para calcular el impacto.">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="grid gap-1">
              <Label>Fase actual del proyecto</Label>
              <Select value={currentPhase} onChange={(e) => setCurrentPhase(e.target.value as ChangePhase)}>
                {Object.entries(PHASE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
              <p className="text-xs text-muted-foreground">Cuanto más avanzado, más cuesta el cambio.</p>
            </div>
            <div className="grid gap-1">
              <Label>Modo de desarrollo del proyecto</Label>
              <Select value={developmentMode} onChange={(e) => setDevelopmentMode(e.target.value as ChangeDevelopmentMode)}>
                {Object.entries(MODE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
              <p className="text-xs text-muted-foreground">Bytecoding y low-code reducen horas, salvo en cambios de alto riesgo.</p>
            </div>
            <div className="grid gap-1">
              <Label>Claridad de la solicitud (1 vaga, 5 clara)</Label>
              <Select value={String(clarityLevel)} onChange={(e) => setClarityLevel(Number(e.target.value) as 1 | 2 | 3 | 4 | 5)}>
                <option value="1">1 — Solo una frase suelta</option>
                <option value="2">2 — Idea general sin detalle</option>
                <option value="3">3 — Se entiende lo que quiere</option>
                <option value="4">4 — Validada con stakeholder</option>
                <option value="5">5 — Lista para estimar, con criterios</option>
              </Select>
            </div>
            <div className="grid gap-1">
              <Label>Urgencia (1 baja, 5 alta)</Label>
              <Select value={String(urgencyLevel)} onChange={(e) => setUrgencyLevel(Number(e.target.value) as 1 | 2 | 3 | 4 | 5)}>
                <option value="1">1 — Puede esperar</option>
                <option value="2">2 — Normal</option>
                <option value="3">3 — Importante</option>
                <option value="4">4 — Urgente</option>
                <option value="5">5 — Crítica (legal o política)</option>
              </Select>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-4 mt-3">
            <ImpactSelect label="Riesgo en seguridad" value={securityImpact} onChange={setSecurityImpact} />
            <ImpactSelect label="Riesgo en datos" value={dataImpact} onChange={setDataImpact} />
            <ImpactSelect label="Riesgo en integración" value={integrationImpact} onChange={setIntegrationImpact} />
          </div>
          <NavButtons onBack={() => setStep(1)} onNext={() => setStep(3)} />
        </StepCard>
      )}

      {step === 3 && (
        <StepCard title="Paso 3. Artefactos afectados" description="Cuántas piezas del sistema toca este cambio.">
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
            {ARTIFACT_DEFS.map((a) => (
              <ArtifactCard
                key={a.key}
                icon={a.icon}
                label={a.label}
                description={a.description}
                value={artifacts[a.key]}
                onChange={(v) => setArtifacts({ ...artifacts, [a.key]: v })}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">Total de artefactos: <strong>{totalArtifacts}</strong>.</p>
          <NavButtons
            onBack={() => setStep(2)}
            onNext={runPreview}
            nextLabel={loading ? "Calculando..." : "Calcular impacto"}
            nextIcon={<Calculator className="w-4 h-4 ml-2" />}
            disableNext={totalArtifacts === 0 || loading}
          />
        </StepCard>
      )}

      {step === 4 && previewResult && (
        <StepCard title="Paso 4. Resultado" description="Lo que dice el motor con los datos capturados.">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <ResultCard
              label="Horas probables"
              value={`${previewResult.probableHours.toFixed(1)} h`}
              hint={`(optimista ${previewResult.optimisticHours.toFixed(1)} h, conservador ${previewResult.conservativeHours.toFixed(1)} h)`}
            />
            <ResultCard
              label="Costo estimado"
              value={formatMXN(previewResult.costImpact)}
              hint={previewResult.minimumChargeApplied ? "Aplicó costo mínimo" : "Tarifa estándar"}
            />
            <ResultCard
              label="Días de impacto"
              value={`${previewResult.calendarImpactDays} días`}
              hint="1 día persona = 8 h"
            />
            <ResultCard
              label="Nivel de riesgo"
              value={previewResult.riskLevel.toUpperCase()}
              valueClassName={riskColor(previewResult.riskLevel)}
              hint={previewResult.requiresFormalApproval ? "Requiere aprobación formal" : "Decisión normal"}
            />
          </div>

          {previewResult.financialBreakdown && (
            <div className="mt-4 rounded-md border bg-card p-3 text-sm">
              <p className="font-semibold mb-2">Desglose financiero estimado</p>
              <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-xs">
                <li>Mano de obra: <strong>{formatMXN(previewResult.financialBreakdown.laborCost)}</strong></li>
                <li>IMSS patronal: {formatMXN(previewResult.financialBreakdown.imssEstimated)}</li>
                <li>ISN Zacatecas + UAZ: {formatMXN(previewResult.financialBreakdown.isnEstimated)}</li>
                <li>Overhead administrativo: {formatMXN(previewResult.financialBreakdown.adminOverhead)}</li>
                <li>Contingencia: {formatMXN(previewResult.financialBreakdown.contingencyAmount)}</li>
                <li>Subtotal antes de IVA: <strong>{formatMXN(previewResult.financialBreakdown.subtotalBeforeVat)}</strong></li>
                <li>IVA 16%: {formatMXN(previewResult.financialBreakdown.vat)}</li>
                <li>Total a facturar: <strong className="text-primary">{formatMXN(previewResult.financialBreakdown.totalInvoice)}</strong></li>
                <li className="sm:col-span-2 pt-1 border-t mt-1">Impacto incremental en mantenimiento mensual: <strong>{formatMXN(previewResult.financialBreakdown.maintenanceMonthlyImpact)}</strong></li>
              </ul>
            </div>
          )}

          {previewResult.plainExplanationForClient && previewResult.plainExplanationForClient.length > 0 && (
            <div className="mt-4 rounded-md border border-blue-200 bg-blue-50/50 p-3 text-sm">
              <p className="font-semibold mb-1 text-blue-900">Explicación para el Ayuntamiento (lenguaje claro)</p>
              <ul className="space-y-1 text-blue-900/90 text-xs">
                {previewResult.plainExplanationForClient.map((line, i) => <li key={i}>• {line}</li>)}
              </ul>
            </div>
          )}

          {previewResult.questionsToClarify.length > 0 && (
            <div className="mt-4 rounded-md border border-amber-300 bg-amber-50/50 p-3 text-sm">
              <p className="font-semibold mb-1 text-amber-900 flex items-center gap-1"><HelpCircle className="w-4 h-4" /> Preguntas sugeridas para aclarar la solicitud</p>
              <ul className="space-y-1 text-amber-900/90 text-xs">
                {previewResult.questionsToClarify.map((q, i) => <li key={i}>• {q}</li>)}
              </ul>
            </div>
          )}

          {previewWarnings.length > 0 && (
            <div className="mt-4 rounded-md border border-amber-300 bg-amber-50/30 p-3 text-xs text-amber-900">
              <p className="font-semibold flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Advertencias del cargador de parámetros</p>
              <ul className="space-y-1 mt-1">
                {previewWarnings.map((w, i) => <li key={i}>• {w}</li>)}
              </ul>
            </div>
          )}

          <NavButtons onBack={() => setStep(3)} onNext={() => setStep(5)} />
        </StepCard>
      )}

      {step === 5 && previewResult && (
        <StepCard title="Paso 5. ¿De dónde sale este número?" description="Desglose técnico de la fórmula aplicada.">
          <div className="rounded-md border bg-card p-3 text-sm font-mono">
            <ul className="space-y-1 text-xs">
              <li>Puntos de artefactos: <strong>{previewResult.breakdown.artifactPoints.toFixed(0)}</strong></li>
              <li>Factor de claridad: <strong>{previewResult.breakdown.clarityFactor.toFixed(2)}</strong></li>
              <li>Factor de fase: <strong>{previewResult.breakdown.phaseFactor.toFixed(2)}</strong></li>
              <li>Factor de riesgo: <strong>{previewResult.breakdown.riskFactor.toFixed(3)}</strong></li>
              <li>Factor de modo: <strong>{previewResult.breakdown.modeFactorAdjusted.toFixed(2)}</strong>{previewResult.breakdown.appliedFloor && " (con piso por alto riesgo)"}</li>
              <li>Contingencia: <strong>{(previewResult.breakdown.contingencyRate * 100).toFixed(0)}%</strong></li>
              <li className="pt-1 border-t mt-1">Base = puntos × claridad × fase × riesgo × modo = <strong>{previewResult.breakdown.baseHours.toFixed(2)} h</strong></li>
              <li>Probable = base + contingencia = <strong>{previewResult.breakdown.estimatedHours.toFixed(2)} h</strong></li>
            </ul>
          </div>

          {previewResult.technicalExplanationForProvider && previewResult.technicalExplanationForProvider.length > 0 && (
            <div className="mt-4 rounded-md border bg-card p-3 text-sm">
              <p className="font-semibold mb-1">Explicación técnica para el proveedor</p>
              <ul className="space-y-1 text-xs text-muted-foreground">
                {previewResult.technicalExplanationForProvider.map((line, i) => <li key={i}>• {line}</li>)}
              </ul>
            </div>
          )}

          {previewResult.legalReferences && previewResult.legalReferences.length > 0 && (
            <div className="mt-4 rounded-md border bg-muted/40 p-3 text-xs">
              <p className="font-semibold mb-1 flex items-center gap-1"><FileText className="w-3 h-3" /> Referencias legales aplicables</p>
              <ul className="space-y-1 text-muted-foreground">
                {previewResult.legalReferences.map((r, i) => <li key={i}>• {r}</li>)}
              </ul>
            </div>
          )}

          {previewResult.parameterSourceKeys && previewResult.parameterSourceKeys.length > 0 && (
            <p className="mt-3 text-xs text-muted-foreground">
              Parámetros usados desde DB: <code className="text-[10px]">{previewResult.parameterSourceKeys.join(", ")}</code>
            </p>
          )}

          <NavButtons onBack={() => setStep(4)} onNext={() => setStep(6)} />
        </StepCard>
      )}

      {step === 6 && previewResult && (
        <StepCard title="Paso 6. Decisión" description="Qué se hace con esta solicitud.">
          {guardrailReason && (
            <div className="rounded-md border border-orange-400 bg-orange-50 p-3 text-sm text-orange-900 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold">Guardrail activo: no se permite "incluido sin costo"</p>
                <p className="text-xs mt-1">{guardrailReason}</p>
              </div>
            </div>
          )}

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-3">
            <DecisionOption icon={<CheckCircle2 className="w-4 h-4" />} status="approved" label="Aprobar y cotizar" current={decision} onSelect={setDecision} />
            <DecisionOption icon={<XCircle className="w-4 h-4" />} status="rejected" label="Rechazar" current={decision} onSelect={setDecision} />
            <DecisionOption icon={<Clock className="w-4 h-4" />} status="deferred" label="Diferir" current={decision} onSelect={setDecision} />
            <DecisionOption icon={<HelpCircle className="w-4 h-4" />} status="requires_clarification" label="Pedir aclaración" current={decision} onSelect={setDecision} />
            <DecisionOption icon={<CheckCircle2 className="w-4 h-4" />} status="scope_increase" label="Aceptar como nuevo alcance" current={decision} onSelect={setDecision} disabled={freeChangeDisabled} />
          </div>

          <div className="grid gap-3 mt-4">
            <div className="grid gap-1">
              <Label>Comentario / motivo de la decisión</Label>
              <Textarea value={decisionComment} onChange={(e) => setDecisionComment(e.target.value)} rows={2} placeholder="Sustento de la decisión." />
            </div>
            <div className="grid gap-1">
              <Label>Quién autoriza esta decisión</Label>
              <Input value={decisionUser} onChange={(e) => setDecisionUser(e.target.value)} placeholder="Nombre y cargo de la persona autorizadora" />
            </div>
          </div>

          <div className="flex flex-wrap justify-between items-center gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={() => setStep(5)}>
              <ChevronLeft className="w-4 h-4 mr-2" />Atrás
            </Button>
            <div className="flex gap-2">
              <Button asChild variant="outline" size="sm">
                <a
                  href={`/api/changes/export?format=json&changeId=${changeId}`}
                  download
                >
                  <Download className="w-4 h-4 mr-2" />Exportar evidencia
                </a>
              </Button>
              <Button onClick={applyDecision} disabled={decisionDisabled || (!freeChangeDisabled ? false : decision === "scope_increase" && decisionComment.trim().length < 10)}>
                {loading ? "Aplicando..." : "Aplicar decisión"}
              </Button>
            </div>
          </div>
        </StepCard>
      )}
    </div>
  );
}

function Stepper({ currentStep }: { currentStep: number }) {
  const steps = [
    { n: 1, label: "Solicitud" },
    { n: 2, label: "Contexto" },
    { n: 3, label: "Artefactos" },
    { n: 4, label: "Resultado" },
    { n: 5, label: "De dónde sale" },
    { n: 6, label: "Decisión" },
  ];
  return (
    <ol className="flex flex-wrap items-center gap-2 text-xs">
      {steps.map((s, i) => (
        <li key={s.n} className="flex items-center gap-2">
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-full border ${
              s.n === currentStep
                ? "bg-primary text-primary-foreground border-primary font-semibold"
                : s.n < currentStep
                  ? "bg-green-100 text-green-900 border-green-300"
                  : "bg-muted text-muted-foreground border-muted"
            }`}
          >
            {s.n < currentStep ? <CheckCircle2 className="w-3 h-3" /> : s.n}
          </span>
          <span className={s.n === currentStep ? "font-medium" : "text-muted-foreground"}>{s.label}</span>
          {i < steps.length - 1 && <ChevronRight className="w-3 h-3 text-muted-foreground" />}
        </li>
      ))}
    </ol>
  );
}

function StepCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function NavButtons({
  onBack,
  onNext,
  nextLabel = "Siguiente",
  nextIcon = <ChevronRight className="w-4 h-4 ml-2" />,
  disableNext = false,
}: {
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  nextIcon?: React.ReactNode;
  disableNext?: boolean;
}) {
  return (
    <div className="flex justify-between items-center mt-4">
      {onBack ? (
        <Button variant="outline" size="sm" onClick={onBack}>
          <ChevronLeft className="w-4 h-4 mr-2" />Atrás
        </Button>
      ) : (
        <span />
      )}
      <Button size="sm" onClick={onNext} disabled={disableNext}>
        {nextLabel}
        {!disableNext && nextIcon}
      </Button>
    </div>
  );
}

function ArtifactCard({
  icon, label, description, value, onChange,
}: { icon: React.ReactNode; label: string; description: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className={`rounded-md border p-3 ${value > 0 ? "bg-primary/5 border-primary/40" : ""}`}>
      <div className="flex items-start gap-2 mb-1">
        <div className="text-primary mt-0.5">{icon}</div>
        <div className="flex-1">
          <p className="text-sm font-medium leading-tight">{label}</p>
          <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{description}</p>
        </div>
      </div>
      <Input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(Math.max(0, Number.parseInt(e.target.value || "0", 10)))}
        className="h-8 mt-1"
      />
    </div>
  );
}

function ResultCard({
  label, value, hint, valueClassName,
}: { label: string; value: string; hint?: string; valueClassName?: string }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs uppercase text-muted-foreground tracking-wide">{label}</p>
      <p className={`text-xl font-bold ${valueClassName ?? ""}`}>{value}</p>
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}

function ImpactSelect({
  label, value, onChange,
}: { label: string; value: 0 | 1 | 2 | 3; onChange: (v: 0 | 1 | 2 | 3) => void }) {
  return (
    <div className="grid gap-1">
      <Label>{label}</Label>
      <Select value={String(value)} onChange={(e) => onChange(Number(e.target.value) as 0 | 1 | 2 | 3)}>
        <option value="0">Ninguno</option>
        <option value="1">Bajo</option>
        <option value="2">Medio</option>
        <option value="3">Alto</option>
      </Select>
    </div>
  );
}

function DecisionOption({
  icon, status, label, current, onSelect, disabled,
}: { icon: React.ReactNode; status: DecisionStatus; label: string; current: DecisionStatus | null; onSelect: (s: DecisionStatus) => void; disabled?: boolean }) {
  const selected = current === status;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect(status)}
      className={`flex items-center gap-2 rounded-md border p-2 text-sm transition-colors text-left ${
        selected ? "border-primary bg-primary/10 font-semibold" : "hover:bg-accent/40"
      } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function riskColor(level: string): string {
  switch (level) {
    case "bajo": return "text-green-700";
    case "medio": return "text-amber-700";
    case "alto": return "text-orange-700";
    case "critico": return "text-red-700";
    default: return "";
  }
}
