/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        /* ─────────────────────────────────────────────────────────
         * PALETA MARACUMANGO — Basada en el logo real
         * Verde lima brillante → primario principal
         * Verde oscuro          → contraste y énfasis
         * Amarillo              → secundario cálido
         * Naranja/mango         → acento tropical
         * Blancos y neutros     → fondos limpios
         * ───────────────────────────────────────────────────────── */

        /* PRIMARY — Verde lima brillante (M grande del logo) */
        "primary":                    "#3a8c00",   /* verde oscuro para texto/íconos primarios */
        "primary-container":          "#6abf00",   /* verde lima brillante: botones CTA, chips activos */
        "primary-fixed":              "#d4f5a0",   /* verde muy claro: fondos sutiles primarios */
        "primary-fixed-dim":          "#a8e060",   /* verde lima claro */
        "on-primary":                 "#ffffff",   /* texto blanco sobre verde */
        "on-primary-container":       "#1a4600",   /* verde muy oscuro sobre verde lima */
        "on-primary-fixed":           "#0d2600",
        "on-primary-fixed-variant":   "#2a6500",
        "inverse-primary":            "#a8e060",

        /* SECONDARY — Amarillo "Maracu" */
        "secondary":                  "#a07800",   /* amarillo oscuro para texto */
        "secondary-container":        "#fdc425",   /* amarillo del logo: badges, tabs activas */
        "secondary-fixed":            "#fff0b0",   /* amarillo muy pálido */
        "secondary-fixed-dim":        "#f7c820",   /* amarillo vibrante */
        "on-secondary":               "#ffffff",
        "on-secondary-container":     "#4a3800",   /* texto oscuro sobre amarillo */
        "on-secondary-fixed":         "#2d2000",
        "on-secondary-fixed-variant": "#5a4300",

        /* TERTIARY — Verde oscuro profundo (contorno del logo) */
        "tertiary":                   "#1a5c00",   /* verde oscuro: acentos, iconos de éxito */
        "tertiary-container":         "#2d7a00",   /* verde oscuro medio: estados activos */
        "tertiary-fixed":             "#b8f07a",   /* verde claro para fondos */
        "tertiary-fixed-dim":         "#8adc40",
        "on-tertiary":                "#ffffff",
        "on-tertiary-container":      "#ffffff",
        "on-tertiary-fixed":          "#0a2600",
        "on-tertiary-fixed-variant":  "#184800",

        /* ACCENT / MANGO — Naranja/mango del logo */
        "surface-tint":               "#e07000",   /* naranja mango: énfasis especial */

        /* SURFACE & BACKGROUNDS — Blancos y neutros cálidos */
        "surface":                    "#fafff5",   /* fondo principal: blanco con tinte verde muy sutil */
        "surface-bright":             "#fafff5",
        "surface-dim":                "#ddf0c8",   /* fondo atenuado */
        "background":                 "#fafff5",
        "on-background":              "#111c0d",   /* texto principal: casi negro con tinte verde */
        "on-surface":                 "#111c0d",
        "on-surface-variant":         "#4a5e3a",   /* texto secundario: gris verdoso */
        "surface-variant":            "#ddeecb",
        "inverse-surface":            "#1e3010",
        "inverse-on-surface":         "#edfad8",

        /* SURFACE CONTAINERS — Jerarquía de fondos */
        "surface-container-lowest":   "#ffffff",
        "surface-container-low":      "#f2faea",   /* verde muy pálido */
        "surface-container":          "#e6f4d8",   /* contenedor estándar */
        "surface-container-high":     "#d8eccc",   /* contenedor elevado */
        "surface-container-highest":  "#cde5bf",   /* contenedor más elevado */

        /* OUTLINE */
        "outline":                    "#6b8a50",   /* bordes: verde grisáceo */
        "outline-variant":            "#bcdba0",   /* bordes suaves */

        /* ERROR — se mantiene estándar Material */
        "error":                      "#ba1a1a",
        "error-container":            "#ffdad6",
        "on-error":                   "#ffffff",
        "on-error-container":         "#93000a",
      },
      borderRadius: {
        "DEFAULT": "0.25rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
        "2xl": "1rem",
        "3xl": "1.5rem",
        "full": "9999px"
      },
      spacing: {
        "space-2xs": "0.25rem",
        "space-xs": "0.5rem",
        "space-sm": "0.75rem",
        "space-md": "1rem",
        "space-lg": "1.5rem",
        "space-xl": "2rem",
        "space-2xl": "3rem",
        "space-3xl": "4rem",
        "margin-mobile": "1.25rem",
        "margin-desktop": "2rem",
        "gutter-mobile": "1rem",
        "gutter-desktop": "1.5rem"
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        headline: ["Plus Jakarta Sans", "sans-serif"],
        "display-hero": ["Plus Jakarta Sans", "sans-serif"],
        "headline-lg": ["Plus Jakarta Sans", "sans-serif"],
        "headline-md": ["Plus Jakarta Sans", "sans-serif"],
        "headline-sm": ["Plus Jakarta Sans", "sans-serif"],
        "label-lg": ["Plus Jakarta Sans", "sans-serif"],
        "label-md": ["Plus Jakarta Sans", "sans-serif"],
        "label-sm": ["Plus Jakarta Sans", "sans-serif"],
        "body-lg": ["Inter", "sans-serif"],
        "body-md": ["Inter", "sans-serif"],
        "body-sm": ["Inter", "sans-serif"]
      },
      fontSize: {
        "display-hero": ["48px", { lineHeight: "56px", letterSpacing: "-0.03em", fontWeight: "800" }],
        "display-hero-mobile": ["34px", { lineHeight: "40px", letterSpacing: "-0.02em", fontWeight: "800" }],
        "headline-lg": ["32px", { lineHeight: "38px", letterSpacing: "-0.02em", fontWeight: "700" }],
        "headline-lg-mobile": ["26px", { lineHeight: "32px", letterSpacing: "-0.02em", fontWeight: "700" }],
        "headline-md": ["22px", { lineHeight: "28px", letterSpacing: "-0.01em", fontWeight: "700" }],
        "headline-sm": ["18px", { lineHeight: "24px", fontWeight: "600" }],
        "body-lg": ["16px", { lineHeight: "24px", fontWeight: "400" }],
        "body-md": ["14px", { lineHeight: "20px", fontWeight: "400" }],
        "body-sm": ["12px", { lineHeight: "16px", fontWeight: "400" }],
        "label-lg": ["14px", { lineHeight: "18px", letterSpacing: "0.02em", fontWeight: "700" }],
        "label-md": ["12px", { lineHeight: "16px", letterSpacing: "0.03em", fontWeight: "600" }],
        "label-sm": ["10px", { lineHeight: "14px", letterSpacing: "0.05em", fontWeight: "700" }]
      }
    }
  }
}
