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
          // the home page is Dua Pulau; the classic portfolio lives at /portfolio/, /dua-pulau/ only forwards to the home page,
          // /race/ is the sailing race game built on the same world, and /crew/ is the players' community (LEGO.js bricks)
          input: { main: "index.html", portfolio: "portfolio/index.html", admin: "admin/index.html", "dua-pulau": "dua-pulau/index.html", race: "race/index.html", crew: "crew/index.html" },
        },
      },
    },
  },
});
