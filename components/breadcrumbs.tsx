import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string; // si no se incluye, es el ítem actual (no clickeable)
}

/**
 * Migas de pan — muestran al usuario DÓNDE está navegando dentro del sistema.
 *
 * Uso:
 *   <Breadcrumbs items={[
 *     { label: "Editar parámetros", href: "/admin/parametros" },
 *     { label: "Calibración del motor" },
 *   ]} />
 *
 * Siempre incluye "Inicio" automáticamente como primer ítem.
 */
export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  const all: BreadcrumbItem[] = [{ label: "Inicio", href: "/" }, ...items];
  return (
    <nav aria-label="Migas de pan" className="flex items-center text-sm text-muted-foreground flex-wrap gap-y-1">
      {all.map((item, i) => {
        const isLast = i === all.length - 1;
        return (
          <span key={`${item.label}-${i}`} className="flex items-center">
            {i === 0 && <Home className="w-3.5 h-3.5 mr-1.5" />}
            {item.href && !isLast ? (
              <Link href={item.href} className="hover:text-foreground transition-colors">
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? "text-foreground font-medium" : ""}>{item.label}</span>
            )}
            {!isLast && <ChevronRight className="w-3.5 h-3.5 mx-1.5 opacity-50" />}
          </span>
        );
      })}
    </nav>
  );
}

/**
 * Variante con badge "Estás editando" cuando aplica — útil para que el operador
 * sepa con claridad que está en modo edición de algo importante.
 */
export function EditBreadcrumbs({ items, editingWhat }: { items: BreadcrumbItem[]; editingWhat?: string }) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-2">
      <Breadcrumbs items={items} />
      {editingWhat && (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-orange-100 text-orange-800 text-xs font-medium border border-orange-200">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
          Editando: {editingWhat}
        </span>
      )}
    </div>
  );
}
