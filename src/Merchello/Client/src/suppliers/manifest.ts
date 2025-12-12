export const manifests: Array<UmbExtensionManifest> = [
  // ============================================
  // Suppliers List Workspace
  // ============================================

  // Main workspace for suppliers list
  {
    type: "workspace",
    kind: "default",
    alias: "Merchello.Suppliers.Workspace",
    name: "Merchello Suppliers Workspace",
    meta: {
      entityType: "merchello-suppliers",
      headline: "Suppliers",
    },
  },

  // List view for suppliers
  {
    type: "workspaceView",
    alias: "Merchello.Suppliers.ListView",
    name: "Merchello Suppliers List View",
    js: () => import("./suppliers-list.element.js"),
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
    js: () => import("./modals/supplier-modal.element.js"),
  },
];
