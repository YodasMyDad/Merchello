export const manifests: Array<UmbExtensionManifest> = [
  // Workspace for tax (when clicking "Tax" in tree)
  {
    type: "workspace",
    kind: "default",
    alias: "Merchello.Tax.Workspace",
    name: "Merchello Tax Workspace",
    meta: {
      entityType: "merchello-tax",
      headline: "Tax",
    },
  },

  // Workspace view for tax
  {
    type: "workspaceView",
    alias: "Merchello.Tax.Workspace.View",
    name: "Merchello Tax View",
    js: () => import("./tax-workspace.element.js"),
    weight: 100,
    meta: {
      label: "Tax",
      pathname: "tax",
      icon: "icon-calculator",
    },
    conditions: [
      {
        alias: "Umb.Condition.WorkspaceAlias",
        match: "Merchello.Tax.Workspace",
      },
    ],
  },
];
