import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Paleta de la cara del desarrollador (valores en app/globals.css)
        lienzo: "rgb(var(--lienzo) / <alpha-value>)",
        papel: "rgb(var(--papel) / <alpha-value>)",
        tinta: {
          DEFAULT: "rgb(var(--tinta) / <alpha-value>)",
          suave: "rgb(var(--tinta-suave) / <alpha-value>)",
        },
        marino: "rgb(var(--marino) / <alpha-value>)",
        accion: "rgb(var(--accion) / <alpha-value>)",
        // EMPS semantic colors for risk levels
        risk: {
          low: "hsl(142 71% 45%)",
          medium: "hsl(45 93% 47%)",
          high: "hsl(25 95% 53%)",
          critical: "hsl(0 84% 60%)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      // Escala de letra: cifra grande (56 px; 40 en celular), título de página
      // (32), título de sección (20). El texto es de 16 y las notas de 12 solo
      // para fuentes.
      fontSize: {
        cifra: ["3.5rem", { lineHeight: "1", letterSpacing: "-0.02em", fontWeight: "800" }],
        "cifra-movil": ["2.5rem", { lineHeight: "1", letterSpacing: "-0.02em", fontWeight: "800" }],
        titulo: ["2rem", { lineHeight: "1.15", letterSpacing: "-0.02em", fontWeight: "800" }],
        seccion: ["1.25rem", { lineHeight: "1.3", fontWeight: "700" }],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
