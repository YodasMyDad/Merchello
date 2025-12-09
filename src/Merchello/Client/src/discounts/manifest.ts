export const manifests: Array<UmbExtensionManifest> = [
  // Workspace for discounts (when clicking "Discounts" in tree)
  {
    type: "workspace",
    kind: "default",
    alias: "Merchello.Discounts.Workspace",
    name: "Merchello Discounts Workspace",
    meta: {
      entityType: "merchello-discounts",
      headline: "Discounts",
    },
  },

  // Workspace view for discounts
  {
    type: "workspaceView",
    alias: "Merchello.Discounts.Workspace.View",
    name: "Merchello Discounts View",
    js: () => import("./discounts-workspace.element.js"),
    weight: 100,
    meta: {
      label: "Discounts",
      pathname: "discounts",
      icon: "icon-megaphone",
    },
    conditions: [
      {
        alias: "Umb.Condition.WorkspaceAlias",
        match: "Merchello.Discounts.Workspace",
      },
    ],
  },
];
