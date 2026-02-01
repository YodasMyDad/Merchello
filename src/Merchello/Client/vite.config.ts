import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@abandoned-checkouts": resolve(__dirname, "src/abandoned-checkouts"),
      "@address-lookup-providers": resolve(__dirname, "src/address-lookup-providers"),
      "@api": resolve(__dirname, "src/api"),
      "@analytics": resolve(__dirname, "src/analytics"),
      "@collections": resolve(__dirname, "src/collections"),
      "@customers": resolve(__dirname, "src/customers"),
      "@dashboards": resolve(__dirname, "src/dashboards"),
      "@discounts": resolve(__dirname, "src/discounts"),
      "@email": resolve(__dirname, "src/email"),
      "@entrypoints": resolve(__dirname, "src/entrypoints"),
      "@exchange-rate-providers": resolve(__dirname, "src/exchange-rate-providers"),
      "@filters": resolve(__dirname, "src/filters"),
      "@fulfilment-providers": resolve(__dirname, "src/fulfilment-providers"),
      "@marketing": resolve(__dirname, "src/marketing"),
      "@notifications": resolve(__dirname, "src/notifications"),
      "@orders": resolve(__dirname, "src/orders"),
      "@outstanding": resolve(__dirname, "src/outstanding"),
      "@payment-providers": resolve(__dirname, "src/payment-providers"),
      "@product-feed": resolve(__dirname, "src/product-feed"),
      "@product-types": resolve(__dirname, "src/product-types"),
      "@products": resolve(__dirname, "src/products"),
      "@providers": resolve(__dirname, "src/providers"),
      "@section": resolve(__dirname, "src/section"),
      "@settings": resolve(__dirname, "src/settings"),
      "@shared": resolve(__dirname, "src/shared"),
      "@shipping": resolve(__dirname, "src/shipping"),
      "@suppliers": resolve(__dirname, "src/suppliers"),
      "@tax": resolve(__dirname, "src/tax"),
      "@tree": resolve(__dirname, "src/tree"),
      "@upsells": resolve(__dirname, "src/upsells"),
      "@warehouses": resolve(__dirname, "src/warehouses"),
      "@webhooks": resolve(__dirname, "src/webhooks"),
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
