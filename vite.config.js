import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
  },
  build: {
    outDir: "dist",
    sourcemap: false, // Disable sourcemaps for production
    minify: "terser",
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
          ui: [
            "@radix-ui/react-dialog",
            "@radix-ui/react-select",
            "@radix-ui/react-button",
          ],
          utils: ["sweetalert2", "framer-motion"],
        },
      },
    },
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.logs in production
        drop_debugger: true,
      },
    },
  },
  preview: {
    port: 4173,
    host: "0.0.0.0",
  },
});
