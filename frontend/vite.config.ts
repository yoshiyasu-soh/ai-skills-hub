import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// ローカル開発時は `wrangler dev`(既定で http://127.0.0.1:8787)を別プロセスで起動し、
// この Vite dev server から /api を素通しさせる想定。
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8787",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
