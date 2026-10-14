import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { headers } from "next/headers";
import Link from "next/link";
import "./globals.css";
import { isAdmin } from "@/lib/admin-auth";
import { AdminRibbon } from "@/components/admin-ribbon";
import { WorkspaceBadge } from "@/components/workspace-badge";
import { hostSinPuerto, type Lado } from "@/lib/lado";
import { getLado } from "@/lib/lado-server";
import { COPIA } from "@/lib/lado-copy";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

// Dirección pública de cada cara, por si el host llega raro o vacío.
const URL_PUBLICA: Record<Lado, string> = {
  desarrollador: "https://estimacion.hazlatarea.com",
  ayuntamiento: "https://ayuntamientos.hazlatarea.com",
};

/**
 * Dirección base de esta visita, para que la imagen de la vista previa salga
 * con dirección completa (Facebook, WhatsApp y Discord no entienden rutas
 * relativas). Se toma del host de la petición porque cada cara vive en el suyo.
 */
async function urlBase(lado: Lado): Promise<URL> {
  const h = await headers();
  const host = (h.get("host") ?? h.get("x-forwarded-host") ?? "").trim().toLowerCase();
  if (!/^[a-z0-9.-]+(:\d{1,5})?$/.test(host)) return new URL(URL_PUBLICA[lado]);
  const sinPuerto = hostSinPuerto(host);
  const local = sinPuerto === "localhost" || sinPuerto.endsWith(".localhost") || sinPuerto === "127.0.0.1";
  const proto = h.get("x-forwarded-proto")?.split(",")[0]?.trim() || (local ? "http" : "https");
  return new URL(`${proto === "http" ? "http" : "https"}://${host}`);
}

/**
 * Título, descripción y vista previa según la cara (lib/lado-copy.ts). Cada
 * página puede poner su propio título: se le agrega la marca de la cara.
 */
export async function generateMetadata(): Promise<Metadata> {
  const lado = await getLado();
  const copia = COPIA[lado];
  return {
    metadataBase: await urlBase(lado),
    title: { default: copia.titulo, template: `%s | ${copia.marca}` },
    description: copia.descripcion,
    openGraph: {
      type: "website",
      locale: "es_MX",
      siteName: copia.marca,
      title: copia.titulo,
      description: copia.descripcion,
      images: [{ url: copia.ogImage, width: 1200, height: 630, alt: copia.ogAlt }],
    },
    twitter: {
      card: "summary_large_image",
      title: copia.titulo,
      description: copia.descripcion,
      images: [copia.ogImage],
    },
  };
}

// Ajustes que cualquier visitante puede hacer para SUS propias estimaciones.
// La calibración del motor cambia valores de todos, así que solo se ofrece
// cuando hay sesión de investigador (ver más abajo).
const NAV_OPERATIVO = [
  { href: "/admin/parametros", label: "Ajustar valores para mis estimaciones" },
] as const;

const ENLACE_PIE = "text-muted-foreground hover:text-foreground transition-colors";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const adminActive = await isAdmin();
  const lado = await getLado();
  const copia = COPIA[lado];
  const esDesarrollador = lado === "desarrollador";
  return (
    <html lang="es" className={inter.variable}>
      <body className="font-sans">
        <div className="min-h-screen flex flex-col bg-background">
          {adminActive && <AdminRibbon />}
          {/* Encabezado. En celular es una sola fila de 56 px (marca y el botón
              Cotizar) y no se queda fijo; el resto del menú está en el pie. De
              640 px en adelante es de 64 px, con el menú completo, y se queda
              fijo arriba. La altura va en el propio encabezado para que el
              borde cuente dentro de los 56 px. */}
          <header
            className={`sm:sticky sm:top-0 z-40 h-14 sm:h-16 border-b bg-card sm:bg-card/95 sm:backdrop-blur no-print ${
              esDesarrollador ? "text-tinta" : ""
            }`}
          >
            <div className="max-w-6xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between gap-3">
              <Link href="/" className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-9 h-9 shrink-0 rounded-md flex items-center justify-center font-bold text-sm ${
                    esDesarrollador ? "bg-marino text-white" : "bg-primary text-primary-foreground"
                  }`}
                >
                  {copia.siglas}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm leading-tight truncate">{copia.marca}</p>
                  {copia.submarca && (
                    <p className="hidden sm:block text-xs text-muted-foreground leading-tight">{copia.submarca}</p>
                  )}
                </div>
              </Link>

              <nav className="hidden sm:flex items-center gap-1 text-sm" aria-label="Menú principal">
                {copia.menu.map((item) =>
                  item.principal ? (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="px-4 py-2 rounded-md bg-marino text-white font-semibold hover:bg-marino/90 transition-colors"
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`px-3 py-2 rounded-md transition-colors ${esDesarrollador ? "hover:bg-papel" : "hover:bg-accent"}`}
                    >
                      {item.label}
                    </Link>
                  ),
                )}
                <WorkspaceBadge />
              </nav>

              <Link
                href="/cotizar"
                className={`sm:hidden shrink-0 inline-flex items-center justify-center h-11 px-5 rounded-md text-white text-sm font-semibold ${
                  esDesarrollador ? "bg-marino" : "bg-primary"
                }`}
              >
                Cotizar
              </Link>
            </div>
          </header>

          {/* Contenido principal */}
          <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-8">
            {children}
          </main>

          {/* Pie de página */}
          <footer className="border-t bg-card mt-12 no-print">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm font-semibold">EMPS Fresnillo</p>
                  <p className="text-sm text-muted-foreground mt-1">{copia.pie}</p>
                  {copia.pieFuentes && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {copia.pieFuentes}{" "}
                      <Link href="/fuentes" className="text-primary hover:underline">Ver las fuentes</Link>
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold mb-2">El sistema</p>
                  <div className="flex flex-col gap-1 text-sm">
                    <Link href="/projects" className={ENLACE_PIE}>Mis proyectos</Link>
                    <Link href="/como-funciona" className={ENLACE_PIE}>Cómo funciona</Link>
                    <Link href="/fuentes" className={ENLACE_PIE}>De dónde salen los números</Link>
                    <Link href="/metodologia" className={ENLACE_PIE}>Metodología</Link>
                    <Link href="/glossary" className={ENLACE_PIE}>Glosario</Link>
                    <Link href="/mi-cuenta" className={ENLACE_PIE}>Mi cuenta</Link>
                    <Link href="/privacidad" className={ENLACE_PIE}>Aviso de privacidad</Link>
                    {/* En la cara del desarrollador este ajuste vive en Fuentes. */}
                    {!esDesarrollador &&
                      NAV_OPERATIVO.map((item) => (
                        <Link key={item.href} href={item.href} className={ENLACE_PIE}>
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
                    <Link href="/investigacion" className={ENLACE_PIE}>
                      Investigación
                    </Link>
                    <Link href="/admin/calibracion" className={ENLACE_PIE}>
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
