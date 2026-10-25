import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base: "./" — относительные пути, работает и на GitHub Pages, и локально.
export default defineConfig({
  base: "./",
  plugins: [react()],
  build: { target: "es2020", outDir: "dist" },
});
