import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@api": resolve(__dirname, "src/api"),
      "@analytics": resolve(__dirname, "src/analytics"),
      "@customers": resolve(__dirname, "src/customers"),
      "@dashboards": resolve(__dirname, "src/dashboards"),
      "@entrypoints": resolve(__dirname, "src/entrypoints"),
      "@marketing": resolve(__dirname, "src/marketing"),
      "@orders": resolve(__dirname, "src/orders"),
      "@payment-providers": resolve(__dirname, "src/payment-providers"),
      "@products": resolve(__dirname, "src/products"),
      "@providers": resolve(__dirname, "src/providers"),
      "@section": resolve(__dirname, "src/section"),
      "@settings": resolve(__dirname, "src/settings"),
      "@shared": resolve(__dirname, "src/shared"),
      "@shipping": resolve(__dirname, "src/shipping"),
      "@tree": resolve(__dirname, "src/tree"),
      "@warehouses": resolve(__dirname, "src/warehouses"),
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
