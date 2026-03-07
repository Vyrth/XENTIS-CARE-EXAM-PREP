import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        heading: ["var(--font-poppins)", "system-ui", "sans-serif"],
        body: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      colors: {
        // Track colors
        track: {
          lvn: {
            DEFAULT: "#0d9488",
            light: "#ccfbf1",
            dark: "#134e4a",
          },
          rn: {
            DEFAULT: "#2563eb",
            light: "#dbeafe",
            dark: "#1e3a8a",
          },
          fnp: {
            DEFAULT: "#7c3aed",
            light: "#ede9fe",
            dark: "#4c1d95",
          },
          pmhnp: {
            DEFAULT: "#c026d3",
            light: "#fdf4ff",
            dark: "#701a75",
          },
        },
        // Semantic
        surface: {
          DEFAULT: "var(--surface)",
          elevated: "var(--surface-elevated)",
          muted: "var(--surface-muted)",
        },
        border: {
          DEFAULT: "var(--border)",
          muted: "var(--border-muted)",
        },
      },
      borderRadius: {
        card: "1rem",
        "card-lg": "1.25rem",
      },
      boxShadow: {
        card: "0 1px 3px 0 rgb(0 0 0 / 0.05), 0 1px 2px -1px rgb(0 0 0 / 0.05)",
        "card-hover":
          "0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.05)",
        "card-elevated":
          "0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.05)",
      },
      ringWidth: {
        focus: "2px",
      },
      outlineOffset: {
        focus: "2px",
      },
    },
  },
  plugins: [],
};

export default config;
