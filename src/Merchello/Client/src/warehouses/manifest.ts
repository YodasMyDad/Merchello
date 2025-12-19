export const manifests: Array<UmbExtensionManifest> = [
  // ============================================
  // Warehouses List Workspace
  // ============================================

  // Main workspace for warehouses list (child of Settings in tree)
  {
    type: "workspace",
    kind: "default",
    alias: "Merchello.Warehouses.Workspace",
    name: "Merchello Warehouses Workspace",
    meta: {
      entityType: "merchello-warehouses",
      headline: "Warehouses",
    },
  },

  // List view for warehouses
  {
    type: "workspaceView",
    alias: "Merchello.Warehouses.ListView",
    name: "Merchello Warehouses List View",
    js: () => import("./components/warehouses-list.element.js"),
    weight: 100,
    meta: {
      label: "Warehouses",
      pathname: "warehouses",
      icon: "icon-store",
    },
    conditions: [
      {
        alias: "Umb.Condition.WorkspaceAlias",
        match: "Merchello.Warehouses.Workspace",
      },
    ],
  },

  // ============================================
  // Warehouse Detail Workspace (Routable)
  // ============================================

  // Routable workspace for warehouse detail/edit
  {
    type: "workspace",
    kind: "routable",
    alias: "Merchello.Warehouse.Detail.Workspace",
    name: "Merchello Warehouse Detail Workspace",
    api: () => import("./contexts/warehouse-detail-workspace.context.js"),
    meta: {
      entityType: "merchello-warehouse",
    },
  },

  // Detail view for warehouse editing
  {
    type: "workspaceView",
    alias: "Merchello.Warehouse.Detail.View",
    name: "Merchello Warehouse Detail View",
    js: () => import("./components/warehouse-detail.element.js"),
    weight: 100,
    meta: {
      label: "Warehouse",
      pathname: "warehouse",
      icon: "icon-store",
    },
    conditions: [
      {
        alias: "Umb.Condition.WorkspaceAlias",
        match: "Merchello.Warehouse.Detail.Workspace",
      },
    ],
  },

  // ============================================
  // Modals
  // ============================================

  // Service region modal
  {
    type: "modal",
    alias: "Merchello.ServiceRegion.Modal",
    name: "Merchello Service Region Modal",
    js: () => import("./modals/service-region-modal.element.js"),
  },

  // Warehouse picker modal (for discount targeting)
  {
    type: "modal",
    alias: "Merchello.WarehousePicker.Modal",
    name: "Warehouse Picker Modal",
    js: () => import("./modals/warehouse-picker-modal.element.js"),
  },
];
