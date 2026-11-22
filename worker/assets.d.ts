// The Worker shares the portfolio's content files (via src/dua-pulau/brief.ts), and those import images and the CV.
// Vite turns each into a URL string; this tells the Worker's type check the same.
declare module "*.jpg" { const url: string; export default url; }
declare module "*.png" { const url: string; export default url; }
declare module "*.pdf" { const url: string; export default url; }
