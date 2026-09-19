import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  base: "/GENBA-AI/",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        privacy: resolve(__dirname, "privacy.html"),
      },
    },
  },
});
