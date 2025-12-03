export const manifests: Array<UmbExtensionManifest> = [
  // Workspace for products (when clicking "Products" in tree)
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

  // Workspace view for products
  {
    type: "workspaceView",
    alias: "Merchello.Products.Workspace.View",
    name: "Merchello Products View",
    js: () => import("./products-workspace.element.js"),
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
];

