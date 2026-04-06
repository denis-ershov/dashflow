import { defineConfig } from "wxt";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  manifest: {
    name: "DashFlow",
    description: "DashFlow — premium glassmorphism new tab dashboard with widgets, todos, weather, and bookmarks.",
    version: "1.0.0",
    permissions: ["storage", "bookmarks", "geolocation"],
    icons: {
      "16": "icon-16.png",
      "32": "icon-32.png",
      "48": "icon-48.png",
      "128": "icon-128.png",
    },
    content_security_policy: {
      extension_pages:
        "script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; object-src 'self'; connect-src 'self' https://api.openweathermap.org https://fonts.googleapis.com https://fonts.gstatic.com;",
    },
  },
  vite: () => ({
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "src"),
      },
      dedupe: ["react", "react-dom"],
    },
    css: {
      postcss: {},
    },
  }),
});
