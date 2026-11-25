// LEGO (lego.js.org, an independent MIT library, not affiliated with the LEGO Group) compiles the Crew's
// single-file web components in src/crew/bricks into src/crew/built, which Vite then bundles.
// The import path points at the npm package, so the runtime ships with the site instead of loading from a CDN.
// preStyle puts the shared look (buttons, fields, cards) inside every brick's shadow root.
import { readFileSync } from "node:fs";

export default {
  importPath: "@polight/lego/dist/lego.min.js",
  sourceDir: "src/crew/bricks",
  targetDir: "src/crew/built",
  useShadowDOM: true,
  preStyle: readFileSync(new URL("./src/crew/shared.css", import.meta.url), "utf8"),
};
