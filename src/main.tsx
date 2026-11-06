import React from "react";
import ReactDOM from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import "@fontsource-variable/inter/wght.css";
import "@fontsource/cormorant-garamond/latin-500.css";
import "@fontsource/cormorant-garamond/latin-600.css";
import "@fontsource/cormorant-garamond/latin-ext-500.css";
import "@fontsource/cormorant-garamond/vietnamese-500.css";
import App from "./App";
import { migrateLegacyData } from "./lib/migrate";
import { newId } from "./lib/utils";
import "./index.css";

try {
  migrateLegacyData(localStorage, newId);
} catch {
  // Storage blocked. The app falls back to defaults for this session.
}

// Ask the browser not to clear local data (photos, plan) when the phone is low on space.
navigator.storage?.persist?.().catch(() => undefined);

registerSW({ immediate: true });

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode><App /></React.StrictMode>
);
