export const manifests: Array<UmbExtensionManifest> = [
  // Create product modal
  {
    type: "modal",
    alias: "Merchello.CreateProduct.Modal",
    name: "Merchello Create Product Modal",
    js: () => import("./modals/create-product-modal.element.js"),
  },

  // Workspace for products list (when clicking "Products" in tree)
  {
    type: "workspace",
    kind: "default",
    alias: "Merchello.Products.Workspace",
    name: "Merchello Products Workspace",
    meta: {
      entityType: "merchello-products",
      headline: "Products",
    },
  },

  // Workspace view for products list
  {
    type: "workspaceView",
    alias: "Merchello.Products.Workspace.View",
    name: "Merchello Products View",
    js: () => import("./components/products-list.element.js"),
    weight: 100,
    meta: {
      label: "Products",
      pathname: "products",
      icon: "icon-box",
    },
    conditions: [
      {
        alias: "Umb.Condition.WorkspaceAlias",
        match: "Merchello.Products.Workspace",
      },
    ],
  },

  // Workspace for individual product detail (routable)
  {
    type: "workspace",
    kind: "routable",
    alias: "Merchello.Product.Detail.Workspace",
    name: "Product Detail Workspace",
    api: () => import("./contexts/product-detail-workspace.context.js"),
    meta: {
      entityType: "merchello-product",
    },
  },
];

