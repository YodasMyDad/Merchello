import { MERCHELLO_PRODUCTS_ENTITY_TYPE } from "@tree/types/tree.types.js";

export const manifests: Array<UmbExtensionManifest> = [
  // Create product modal
  {
    type: "modal",
    alias: "Merchello.CreateProduct.Modal",
    name: "Merchello Create Product Modal",
    js: () => import("@products/modals/create-product-modal.element.js"),
  },

  // Option editor modal
  {
    type: "modal",
    alias: "Merchello.OptionEditor.Modal",
    name: "Merchello Option Editor Modal",
    js: () => import("@products/modals/option-editor-modal.element.js"),
  },

  // Variant batch update modal
  {
    type: "modal",
    alias: "Merchello.VariantBatchUpdate.Modal",
    name: "Merchello Variant Batch Update Modal",
    js: () => import("@products/modals/variant-batch-update-modal.element.js"),
  },

  // Workspace for products list (when clicking "Products" in tree)
  {
    type: "workspace",
    kind: "routable",
    alias: "Merchello.Products.Workspace",
    name: "Merchello Products Workspace",
    api: () => import("@products/contexts/products-workspace.context.js"),
    meta: {
      entityType: MERCHELLO_PRODUCTS_ENTITY_TYPE,
    },
  },

  // Workspace view for products list (used when on list route)
  {
    type: "workspaceView",
    alias: "Merchello.Products.Workspace.View",
    name: "Merchello Products View",
    js: () => import("@products/components/products-list.element.js"),
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
