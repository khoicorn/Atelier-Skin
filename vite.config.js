import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
export default defineConfig({
    base: "./",
    plugins: [
        react(),
        VitePWA({
            registerType: "autoUpdate",
            includeAssets: ["icons/icon.svg"],
            manifest: {
                name: "Atelier Skin — Private Skincare Ledger",
                short_name: "Atelier Skin",
                description: "Track routines, clinic visits, progress photos and skincare costs.",
                theme_color: "#f2efe8",
                background_color: "#f2efe8",
                display: "standalone",
                orientation: "portrait",
                start_url: "./",
                icons: [
                    { src: "icons/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any maskable" }
                ]
            },
            workbox: {
                globPatterns: ["**/*.{js,css,html,svg,png,woff2}"]
            }
        })
    ]
});
