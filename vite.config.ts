import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000,
    host: "0.0.0.0",
  },
  build: {
    target: "es2022",
    cssCodeSplit: true,
    sourcemap: false,
    minify: "esbuild",
    reportCompressedSize: true,
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        format: "esm",
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (/react-dom|scheduler/.test(id)) return "vendor-react-core";
            if (id.includes("lucide-react")) return "vendor-lucide";
            if (id.includes("@fontsource-variable") || id.includes("@fontsource")) return "vendor-fonts";
            if (id.includes("tailwindcss") || id.includes("postcss") || id.includes("@tailwindcss")) return "vendor-tailwind";
            return "vendor-shared";
          }
        },
      },
    },
  },
});
