import { MERCHELLO_WAREHOUSES_ENTITY_TYPE } from "@tree/types/tree.types.js";

export const manifests: Array<UmbExtensionManifest> = [
  // ============================================
  // Warehouses List Workspace
  // ============================================

  // Main workspace for warehouses list (child of Settings in tree)
  {
    type: "workspace",
    kind: "routable",
    alias: "Merchello.Warehouses.Workspace",
    name: "Merchello Warehouses Workspace",
    api: () => import("@warehouses/contexts/warehouses-workspace.context.js"),
    meta: {
      entityType: MERCHELLO_WAREHOUSES_ENTITY_TYPE,
    },
  },

  // List view for warehouses (used when on list route)
  {
    type: "workspaceView",
    alias: "Merchello.Warehouses.ListView",
    name: "Merchello Warehouses List View",
    js: () => import("@warehouses/components/warehouses-list.element.js"),
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
  // Modals
  // ============================================

  // Service region modal
  {
    type: "modal",
    alias: "Merchello.ServiceRegion.Modal",
    name: "Merchello Service Region Modal",
    js: () => import("@warehouses/modals/service-region-modal.element.js"),
  },

  // Warehouse picker modal (for discount targeting)
  {
    type: "modal",
    alias: "Merchello.WarehousePicker.Modal",
    name: "Warehouse Picker Modal",
    js: () => import("@warehouses/modals/warehouse-picker-modal.element.js"),
  },
];
