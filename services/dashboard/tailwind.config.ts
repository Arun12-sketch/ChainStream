import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#080B14",
        sidebar: "#0D1220",
        card: "#111827",
        elevated: "#182235",
        accent: {
          cyan: "#22D3EE",
          indigo: "#818CF8",
        },
        status: {
          healthy: "#34D399",
          warning: "#FBBF24",
          error: "#FB7185",
        },
        text: {
          primary: "#F1F5F9",
          secondary: "#94A3B8",
        },
        border: "#263247",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "Courier New", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
