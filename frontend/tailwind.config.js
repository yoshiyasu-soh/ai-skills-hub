/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        skill: "#2563eb",
        prompt: "#7c3aed",
      },
    },
  },
  plugins: [],
};
