import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "EMPS-Fresnillo · Estimador Municipal de Proyectos de Software",
  description:
    "Estimación temprana integral: técnica, modo de desarrollo, fiscal-laboral, flujo de efectivo y control de cambios.",
};

const NAV_USUARIO = [
  { href: "/", label: "Inicio" },
  { href: "/projects", label: "Mis proyectos" },
  { href: "/como-funciona", label: "Tutorial" },
  { href: "/glossary", label: "Glosario" },
] as const;

const NAV_ADMIN = [
  { href: "/admin/parametros", label: "Editor de parámetros" },
  { href: "/admin/calibracion", label: "Calibración del motor" },
  { href: "/admin/datasets", label: "Datasets" },
  { href: "/admin/fuentes-vivas", label: "Fuentes vivas" },
  { href: "/admin/modelos-ml", label: "Modelos ML" },
  { href: "/comparator", label: "Comparador técnico" },
  { href: "/audit", label: "Bitácora" },
  { href: "/users", label: "Usuarios y roles" },
] as const;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={inter.variable}>
      <body className="font-sans">
        <div className="min-h-screen flex flex-col bg-background">
          {/* Header fijo arriba */}
          <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 no-print">
            <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
              <Link href="/" className="flex items-center gap-3 shrink-0">
                <div className="w-9 h-9 rounded-md bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                  EM
                </div>
                <div className="hidden sm:block">
                  <p className="font-semibold text-sm leading-tight">EMPS-Fresnillo</p>
                  <p className="text-xs text-muted-foreground leading-tight">Estimador Municipal de Proyectos</p>
                </div>
              </Link>
              <nav className="flex items-center gap-1 text-sm">
                {NAV_USUARIO.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="px-3 py-2 rounded-md hover:bg-accent transition-colors"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          </header>

          {/* Contenido principal */}
          <main className="flex-1 w-full max-w-6xl mx-auto px-6 py-8">
            {children}
          </main>

          {/* Footer con menú administrativo */}
          <footer className="border-t bg-card mt-12 no-print">
            <div className="max-w-6xl mx-auto px-6 py-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2 font-semibold">EMPS-Fresnillo · v0.1.0</p>
                  <p className="text-sm">Universidad Autónoma de Zacatecas</p>
                  <p className="text-xs text-muted-foreground">Ingeniería en Software · Seminario de Investigación</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2 font-semibold">Pantallas administrativas</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
                    {NAV_ADMIN.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-6 pt-4 border-t">
                Las estimaciones son preliminares. La determinación oficial fiscal y laboral requiere revisión profesional contable, fiscal y legal.
              </p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
