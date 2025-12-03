import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@api": resolve(__dirname, "src/api"),
      "@orders": resolve(__dirname, "src/orders"),
      "@payment-providers": resolve(__dirname, "src/payment-providers"),
      "@shared": resolve(__dirname, "src/shared"),
    },
  },
  build: {
    lib: {
      entry: "src/bundle.manifests.ts", // Bundle registers one or more manifests
      formats: ["es"],
      fileName: "merchello",
    },
    outDir: "../wwwroot/App_Plugins/Merchello", // your web component will be saved in this location
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      external: [/^@umbraco/],
    },
  },
});
