import Link from "next/link";

const PASOS = [
  { n: 1, label: "Datos generales", path: "" },
  { n: 2, label: "Piezas del sistema", path: "/modules" },
  { n: 3, label: "Equipo", path: "/team" },
  { n: 4, label: "Calcular", path: "/estimate" },
  { n: 5, label: "Resultado y reportes", path: "" },
];

/**
 * Los cinco pasos del proyecto, con el actual marcado. Antes solo se veían en
 * la pantalla del resultado; quien estaba capturando no sabía cuánto faltaba.
 */
export function BarraDePasos({ projectId, actual }: { projectId: string; actual: number }) {
  return (
    <ol className="flex flex-wrap gap-2 text-xs">
      {PASOS.map((p) => {
        const activo = p.n === actual;
        const hecho = p.n < actual;
        return (
          <li key={p.n}>
            <Link
              href={`/projects/${projectId}${p.path}`}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 transition-colors ${
                activo ? "border-primary bg-primary text-primary-foreground" : hecho ? "border-green-200 bg-green-50 text-green-800" : "text-muted-foreground hover:bg-accent"
              }`}
            >
              <span className="font-mono">{p.n}</span>
              {p.label}
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
