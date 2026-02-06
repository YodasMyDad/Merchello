import { MERCHELLO_PRODUCT_TYPES_ENTITY_TYPE } from "@tree/types/tree.types.js";

export const manifests: Array<UmbExtensionManifest> = [
  // Workspace for product types (when clicking "Product Types" in tree)
  {
    type: "workspace",
    kind: "routable",
    alias: "Merchello.ProductTypes.Workspace",
    name: "Merchello Product Types Workspace",
    api: () => import("@product-types/contexts/product-types-workspace.context.js"),
    meta: {
      entityType: MERCHELLO_PRODUCT_TYPES_ENTITY_TYPE,
    },
  },

  // Workspace view for product types
  {
    type: "workspaceView",
    alias: "Merchello.ProductTypes.Workspace.View",
    name: "Merchello Product Types View",
    js: () => import("@product-types/components/product-types-list.element.js"),
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
    js: () => import("@product-types/modals/product-type-modal.element.js"),
  },

  // Product type picker modal (for discount targeting)
  {
    type: "modal",
    alias: "Merchello.ProductTypePicker.Modal",
    name: "Product Type Picker Modal",
    js: () => import("@product-types/modals/product-type-picker-modal.element.js"),
  },
];
