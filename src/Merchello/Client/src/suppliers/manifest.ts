import { MERCHELLO_SUPPLIERS_ENTITY_TYPE } from "@tree/types/tree.types.js";

export const manifests: Array<UmbExtensionManifest> = [
  // ============================================
  // Suppliers List Workspace
  // ============================================

  // Main workspace for suppliers list
  {
    type: "workspace",
    kind: "routable",
    alias: "Merchello.Suppliers.Workspace",
    name: "Merchello Suppliers Workspace",
    api: () => import("@suppliers/contexts/suppliers-workspace.context.js"),
    meta: {
      entityType: MERCHELLO_SUPPLIERS_ENTITY_TYPE,
    },
  },

  // List view for suppliers
  {
    type: "workspaceView",
    alias: "Merchello.Suppliers.ListView",
    name: "Merchello Suppliers List View",
    js: () => import("@suppliers/components/suppliers-list.element.js"),
    weight: 100,
    meta: {
      label: "Suppliers",
      pathname: "suppliers",
      icon: "icon-truck",
    },
    conditions: [
      {
        alias: "Umb.Condition.WorkspaceAlias",
        match: "Merchello.Suppliers.Workspace",
      },
    ],
  },

  // ============================================
  // Modals
  // ============================================

  // Supplier modal (handles both create and edit)
  {
    type: "modal",
    alias: "Merchello.Supplier.Modal",
    name: "Merchello Supplier Modal",
    js: () => import("@suppliers/modals/supplier-modal.element.js"),
  },

  // Supplier picker modal (for discount targeting)
  {
    type: "modal",
    alias: "Merchello.SupplierPicker.Modal",
    name: "Supplier Picker Modal",
    js: () => import("@suppliers/modals/supplier-picker-modal.element.js"),
  },
];
