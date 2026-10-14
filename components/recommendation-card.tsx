/**
 * "¿Cuál te conviene?": la recomendación del motor (lib/engine/recommendation.ts)
 * en dos renglones y un botón. El primero dice la opción y su precio; el
 * segundo, la razón principal. Las demás razones, las advertencias, lo que se
 * descartó y la segunda opción quedan en "Ver todas las razones", plegado.
 * Server component presentacional: recibe todo por props.
 */
import Link from "next/link";
import { nombreDeForma, NOMBRE_DE_ESCENARIO, NOMBRE_TECNICO_DE_FORMA } from "@/lib/formas";
import { pesos } from "@/lib/graficas";
import type { RecommendationResult } from "@/lib/engine/recommendation";

export function RecommendationCard({
  projectId,
  recommendation,
  selectedMode,
  selectedScenario,
}: {
  projectId: string;
  recommendation: RecommendationResult;
  selectedMode: string;
  selectedScenario: string;
}) {
  const r = recommendation;
  const escenario = (s: string) => NOMBRE_DE_ESCENARIO[s] ?? s;
  const isViewing = r.best.mode === selectedMode && r.best.scenario === selectedScenario;

  const intro =
    r.roleUsed === "operador_municipal"
      ? "Como personal del Ayuntamiento, te conviene presupuestar con"
      : r.roleUsed === "proveedor"
        ? "Te conviene cotizar con"
        : "La opción más equilibrada es";

  const masRazones = r.reasons.slice(1);
  const hayMas = masRazones.length > 0 || r.warnings.length > 0 || r.excluidos.length > 0 || !!r.runnerUp || r.roleUsed === "neutral";

  return (
    <section aria-labelledby="cual-te-conviene" className="border-l-4 border-marino pl-5">
      <h2 id="cual-te-conviene" className="text-seccion text-tinta">
        ¿Cuál te conviene?
      </h2>
      <p className="mt-2 text-base text-tinta">
        {intro}{" "}
        <strong className="font-semibold" title={NOMBRE_TECNICO_DE_FORMA[r.best.mode]}>
          {nombreDeForma(r.best.mode)}
        </strong>
        , escenario {escenario(r.best.scenario)}: <strong className="font-semibold">{pesos(r.bestOption.total)}</strong>.
        {isViewing && " Es la opción que estás viendo."}
      </p>
      {r.reasons[0] && <p className="mt-1 text-base text-tinta-suave">{r.reasons[0]}</p>}

      {!isViewing && (
        <div className="mt-3">
          <Link
            href={`/projects/${projectId}?mode=${r.best.mode}&scenario=${r.best.scenario}`}
            scroll={false}
            className="inline-flex min-h-11 items-center rounded-lg border border-marino px-5 text-base font-semibold text-marino transition-colors hover:bg-papel"
          >
            Ver esta opción
          </Link>
        </div>
      )}

      {hayMas && (
        <details className="mt-2">
          <summary className="inline-flex min-h-11 cursor-pointer items-center text-base font-semibold text-accion underline-offset-4 hover:underline">
            Ver todas las razones
          </summary>
          <div className="space-y-4 pb-1 pt-1 text-base">
            {masRazones.length > 0 && (
              <ul className="list-inside list-disc space-y-1.5 marker:text-marino">
                {masRazones.map((reason, i) => (
                  <li key={i}>{reason}</li>
                ))}
              </ul>
            )}

            {r.warnings.length > 0 && (
              <div className="space-y-1 border-l-4 border-amber-600 pl-4">
                {r.warnings.map((w, i) => (
                  <p key={i} className="text-amber-950">
                    {w}
                  </p>
                ))}
              </div>
            )}

            {r.excluidos.length > 0 && (
              <div className="space-y-1">
                <p className="font-semibold">Descartadas para este proyecto, aunque salgan más baratas:</p>
                {r.excluidos.map((x) => (
                  <p key={x.mode} className="text-tinta-suave">
                    <strong className="font-semibold text-tinta" title={NOMBRE_TECNICO_DE_FORMA[x.mode]}>
                      {nombreDeForma(x.mode)}
                    </strong>{" "}
                    ({pesos(x.total)}): {x.razones[0]}
                  </p>
                ))}
              </div>
            )}

            {r.runnerUp && (
              <p className="text-tinta-suave">
                Segunda opción: <strong className="font-semibold text-tinta">{nombreDeForma(r.runnerUp.mode)}</strong>, escenario{" "}
                {escenario(r.runnerUp.scenario)}. {r.runnerUp.why}
              </p>
            )}

            {r.roleUsed === "neutral" && (
              <p className="text-tinta-suave">
                ¿Trabajas en un Ayuntamiento o eres proveedor?{" "}
                <Link href="/mi-cuenta" className="font-medium text-accion underline underline-offset-4">
                  Dinos en Mi cuenta
                </Link>{" "}
                y la recomendación se ajusta a tu caso.
              </p>
            )}

            <p className="text-tinta-suave">
              Así se elige: el sistema compara las opciones ya calculadas de este proyecto con reglas fijas, sin adivinar. Descarta las de riesgo crítico y las formas
              de hacerlo que no sirven para este proyecto, y pondera precio, riesgo y tiempo según quién eres. La decisión final siempre es tuya.
            </p>
          </div>
        </details>
      )}
    </section>
  );
}
