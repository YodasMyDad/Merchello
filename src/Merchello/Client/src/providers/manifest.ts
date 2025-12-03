export const manifests: Array<UmbExtensionManifest> = [
  // Workspace for providers (when clicking "Providers" in tree)
  {
    type: "workspace",
    kind: "default",
    alias: "Merchello.Providers.Workspace",
    name: "Merchello Providers Workspace",
    meta: {
      entityType: "merchello-providers",
      headline: "Providers",
    },
  },

  // Workspace view for providers overview
  {
    type: "workspaceView",
    alias: "Merchello.Providers.Workspace.View",
    name: "Merchello Providers View",
    js: () => import("./providers-workspace.element.js"),
    weight: 100,
    meta: {
      label: "Overview",
      pathname: "overview",
      icon: "icon-nodes",
    },
    conditions: [
      {
        alias: "Umb.Condition.WorkspaceAlias",
        match: "Merchello.Providers.Workspace",
      },
    ],
  },
];

