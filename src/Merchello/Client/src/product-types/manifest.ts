export const manifests: Array<UmbExtensionManifest> = [
  // Workspace for product types (when clicking "Product Types" in tree)
  {
    type: "workspace",
    kind: "default",
    alias: "Merchello.ProductTypes.Workspace",
    name: "Merchello Product Types Workspace",
    meta: {
      entityType: "merchello-product-types",
      headline: "Product Types",
    },
  },

  // Workspace view for product types
  {
    type: "workspaceView",
    alias: "Merchello.ProductTypes.Workspace.View",
    name: "Merchello Product Types View",
    js: () => import("./components/product-types-list.element.js"),
    weight: 100,
    meta: {
      label: "Product Types",
      pathname: "product-types",
      icon: "icon-tags",
    },
    conditions: [
      {
        alias: "Umb.Condition.WorkspaceAlias",
        match: "Merchello.ProductTypes.Workspace",
      },
    ],
  },

  // Modal for create/edit product type
  {
    type: "modal",
    alias: "Merchello.ProductType.Modal",
    name: "Merchello Product Type Modal",
    js: () => import("./modals/product-type-modal.element.js"),
  },
];
