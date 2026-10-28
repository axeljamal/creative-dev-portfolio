import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// served from https://axeljamal.github.io/creative-dev-portfolio/
export default defineConfig({
  base: "/creative-dev-portfolio/",
  plugins: [react(), tailwindcss()],
});
