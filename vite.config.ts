import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    force: true,
  },
  plugins: [react()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom"],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // React core + Radix UI in same chunk to avoid forwardRef undefined error
          if (
            id.includes("node_modules/react/") ||
            id.includes("node_modules/react-dom/") ||
            id.includes("node_modules/react-router-dom/") ||
            id.includes("node_modules/scheduler/") ||
            id.includes("node_modules/@radix-ui/")
          ) {
            return "vendor-react";
          }
          // TipTap rich text editor (heavy)
          if (id.includes("node_modules/@tiptap/")) {
            return "vendor-tiptap";
          }
          // Recharts (heavy)
          if (id.includes("node_modules/recharts/") || id.includes("node_modules/d3-")) {
            return "vendor-recharts";
          }
          // XLSX (heavy)
          if (id.includes("node_modules/xlsx/")) {
            return "vendor-xlsx";
          }
          // Supabase
          if (id.includes("node_modules/@supabase/")) {
            return "vendor-supabase";
          }
          // TanStack Query
          if (id.includes("node_modules/@tanstack/")) {
            return "vendor-tanstack";
          }
          // DnD Kit
          if (id.includes("node_modules/@dnd-kit/")) {
            return "vendor-dndkit";
          }
          // Other node_modules
          if (id.includes("node_modules/")) {
            return "vendor-misc";
          }
        },
      },
    },
  },
}));
