import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { BrowserRouter } from "react-router-dom";
import "./index.css";

// ─── Suppress R3F internal Three.js deprecation warnings ─────────────────────
// @react-three/fiber v9 uses THREE.Clock + PCFSoftShadowMap internally.
// These are deprecated in Three.js r183 but R3F hasn't updated yet.
// Only these specific strings are filtered — your own warnings still show.
const _warn = console.warn.bind(console);
console.warn = (...args) => {
  const msg = typeof args[0] === "string" ? args[0] : "";
  if (
    msg.includes("THREE.Clock") ||
    msg.includes("PCFSoftShadowMap") ||
    msg.includes("THREE.WebGLShadowMap")
  ) return;
  _warn(...args);
};

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);