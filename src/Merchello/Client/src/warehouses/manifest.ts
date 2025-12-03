export const manifests: Array<UmbExtensionManifest> = [
  // Workspace for warehouses (child of Settings in tree)
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

  // Workspace view for warehouses
  {
    type: "workspaceView",
    alias: "Merchello.Warehouses.Workspace.View",
    name: "Merchello Warehouses View",
    js: () => import("./warehouses-workspace.element.js"),
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
];

