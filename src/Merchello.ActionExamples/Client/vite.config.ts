import { defineConfig } from "vite";

export default defineConfig({
  publicDir: "public",
  build: {
    lib: {
      entry: "src/index.ts",
      formats: ["es"],
      fileName: "merchello-action-examples",
    },
    outDir: "../wwwroot",
    emptyOutDir: false,
    sourcemap: true,
    rollupOptions: {
      external: [/^@umbraco/],
    },
  },
});
