import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { supportsRefraction } from "./components/GlassFilter";
import "./index.css";
import "./theme";

if (supportsRefraction()) document.documentElement.classList.add("refract");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
