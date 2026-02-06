
export const manifests: Array<UmbExtensionManifest> = [
  // Product picker modal for selecting products in orders and property editors
  {
    type: "modal",
    alias: "Merchello.ProductPicker.Modal",
    name: "Merchello Product Picker Modal",
    js: () => import("@shared/product-picker/product-picker-modal.element.js"),
  },
];
