export const manifests: Array<UmbExtensionManifest> = [
  // Workspace for shipping (child of Settings in tree)
  {
    type: "workspace",
    kind: "default",
    alias: "Merchello.Shipping.Workspace",
    name: "Merchello Shipping Workspace",
    meta: {
      entityType: "merchello-shipping",
      headline: "Shipping",
    },
  },

  // Workspace view for shipping
  {
    type: "workspaceView",
    alias: "Merchello.Shipping.Workspace.View",
    name: "Merchello Shipping View",
    js: () => import("./shipping-workspace.element.js"),
    weight: 100,
    meta: {
      label: "Shipping",
      pathname: "shipping",
      icon: "icon-truck",
    },
    conditions: [
      {
        alias: "Umb.Condition.WorkspaceAlias",
        match: "Merchello.Shipping.Workspace",
      },
    ],
  },
];

