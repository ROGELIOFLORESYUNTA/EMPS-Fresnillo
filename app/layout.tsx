import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { isAdmin } from "@/lib/admin-auth";
import { AdminRibbon } from "@/components/admin-ribbon";
import { WorkspaceBadge } from "@/components/workspace-badge";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "EMPS Fresnillo. Estimador Municipal de Proyectos de Software",
  description:
    "Estimación temprana integral: técnica, modo de desarrollo, fiscal-laboral, flujo de efectivo y control de cambios.",
};

const NAV_USUARIO = [
  { href: "/", label: "Inicio" },
  { href: "/projects", label: "Mis proyectos" },
  { href: "/como-funciona", label: "Tutorial" },
  { href: "/glossary", label: "Glosario" },
] as const;

// Ajustes que cualquier visitante puede hacer para SUS propias estimaciones.
// La calibración del motor cambia valores de todos, así que solo se ofrece
// cuando hay sesión de investigador (ver más abajo).
const NAV_OPERATIVO = [
  { href: "/admin/parametros", label: "Ajustar valores para mis estimaciones" },
] as const;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const adminActive = await isAdmin();
  return (
    <html lang="es" className={inter.variable}>
      <body className="font-sans">
        <div className="min-h-screen flex flex-col bg-background">
          {adminActive && <AdminRibbon />}
          {/* Header fijo arriba */}
          <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 no-print">
            <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
              <Link href="/" className="flex items-center gap-3 shrink-0">
                <div className="w-9 h-9 rounded-md bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                  EM
                </div>
                <div className="hidden sm:block">
                  <p className="font-semibold text-sm leading-tight">EMPS Fresnillo</p>
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
                <WorkspaceBadge />
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
                  <p className="text-sm font-semibold">EMPS Fresnillo</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Estimador Municipal de Proyectos de Software. Desarrollado por Rogelio Flores Rodríguez como
                    parte de una investigación de Ingeniería de Software en la Universidad Autónoma de Zacatecas.
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Valores fiscales y laborales vigentes 2026, verificados contra el Diario Oficial de la
                    Federación, CONASAMI, IMSS y la Secretaría de Finanzas de Zacatecas.{" "}
                    <Link href="/fuentes" className="text-primary hover:underline">Ver las fuentes</Link>
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold mb-2">El sistema</p>
                  <div className="flex flex-col gap-1 text-sm">
                    <Link href="/como-funciona" className="text-muted-foreground hover:text-foreground transition-colors">Cómo funciona</Link>
                    <Link href="/fuentes" className="text-muted-foreground hover:text-foreground transition-colors">De dónde salen los números</Link>
                    <Link href="/metodologia" className="text-muted-foreground hover:text-foreground transition-colors">Metodología</Link>
                    <Link href="/glossary" className="text-muted-foreground hover:text-foreground transition-colors">Glosario</Link>
                    <Link href="/privacidad" className="text-muted-foreground hover:text-foreground transition-colors">Aviso de privacidad</Link>
                    {NAV_OPERATIVO.map((item) => (
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
              <div className="mt-6 pt-4 border-t flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground flex-1 min-w-[280px]">
                  Las estimaciones son preliminares. La determinación oficial fiscal y laboral requiere revisión profesional contable, fiscal y legal.
                </p>
                {adminActive && (
                  <div className="flex gap-3 text-xs">
                    <Link href="/investigacion" className="text-muted-foreground hover:text-foreground transition-colors">
                      Investigación
                    </Link>
                    <Link href="/admin/calibracion" className="text-muted-foreground hover:text-foreground transition-colors">
                      Calibración del motor
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
