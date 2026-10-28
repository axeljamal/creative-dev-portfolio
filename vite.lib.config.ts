import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// builds src/ds into dist-ds/ as a component library (for Claude Design sync)
export default defineConfig({
  plugins: [react(), tailwindcss()],
  publicDir: false,
  build: {
    outDir: "dist-ds",
    emptyOutDir: true,
    cssCodeSplit: false,
    lib: {
      entry: "src/ds/index.ts",
      formats: ["es"],
      fileName: "index",
      cssFileName: "styles",
    },
    rollupOptions: {
      external: (id) => /^(react|react-dom|motion|react-icons)(\/|$)/.test(id),
    },
  },
});
