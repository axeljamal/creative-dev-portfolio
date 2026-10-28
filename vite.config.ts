import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { cloudflare } from "@cloudflare/vite-plugin";

// the site, the /admin inbox and the /api Worker all run on Cloudflare
export default defineConfig({
  plugins: [react(), tailwindcss(), cloudflare()],
  environments: {
    // browser build only; the Worker build has its own entry
    client: {
      build: {
        rollupOptions: {
          input: { main: "index.html", admin: "admin/index.html" },
        },
      },
    },
  },
});
