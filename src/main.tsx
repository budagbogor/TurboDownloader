import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

function ensureFavicon() {
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"][sizes="any"]');
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    link.type = "image/x-icon";
    link.sizes = "any";
    document.head.appendChild(link);
  }
  const ts = String(Date.now());
  link.href = "/favicon.ico?v=" + ts;
  const short = document.querySelector<HTMLLinkElement>('link[rel="shortcut icon"]');
  if (!short) {
    const s = document.createElement("link");
    s.rel = "shortcut icon";
    s.type = "image/x-icon";
    s.href = "/favicon.ico?v=" + ts;
    document.head.appendChild(s);
  } else {
    short.href = "/favicon.ico?v=" + ts;
  }
}

ensureFavicon();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
