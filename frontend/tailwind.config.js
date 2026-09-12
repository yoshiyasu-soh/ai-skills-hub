/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        skill: "#2563eb",
        prompt: "#7c3aed",
        brand: {
          50: "#eef1ff",
          100: "#e0e4ff",
          200: "#c6cbff",
          300: "#a3a8fd",
          400: "#8281f7",
          500: "#6a5eec",
          600: "#5a3fdc",
          700: "#4c31bd",
          800: "#402a98",
          900: "#37277a",
        },
      },
      fontFamily: {
        sans: ["Inter", "Hiragino Sans", "Yu Gothic", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 12px rgba(15, 23, 42, 0.03)",
        "card-hover": "0 8px 24px rgba(15, 23, 42, 0.08), 0 2px 6px rgba(15, 23, 42, 0.04)",
        popover: "0 12px 32px rgba(15, 23, 42, 0.12), 0 2px 8px rgba(15, 23, 42, 0.06)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.18s ease-out",
      },
    },
  },
  plugins: [],
};
