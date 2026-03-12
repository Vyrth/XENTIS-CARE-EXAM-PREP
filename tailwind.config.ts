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
        "card-premium":
          "0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.03), 0 0 0 1px rgb(99 102 241 / 0.04)",
        "card-premium-hover":
          "0 12px 24px -4px rgb(0 0 0 / 0.08), 0 4px 8px -2px rgb(0 0 0 / 0.04), 0 0 0 1px rgb(99 102 241 / 0.06)",
        glow: "0 0 40px -10px rgb(99 102 241 / 0.4)",
        "glow-cyan": "0 0 60px -15px rgb(6 182 212 / 0.35)",
        "glow-violet": "0 0 60px -15px rgb(139 92 246 / 0.35)",
        "glow-subtle": "0 0 30px -8px rgb(99 102 241 / 0.15)",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-mesh":
          "linear-gradient(135deg, rgb(99 102 241 / 0.08) 0%, transparent 50%), linear-gradient(225deg, rgb(6 182 212 / 0.06) 0%, transparent 50%), linear-gradient(315deg, rgb(139 92 246 / 0.06) 0%, transparent 50%)",
        "gradient-learner":
          "linear-gradient(180deg, rgb(99 102 241 / 0.03) 0%, transparent 30%), linear-gradient(90deg, rgb(139 92 246 / 0.02) 0%, transparent 50%)",
      },
      animation: {
        "gradient-shift": "gradient-shift 8s ease infinite",
        float: "float 6s ease-in-out infinite",
      },
      keyframes: {
        "gradient-shift": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.85" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
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
