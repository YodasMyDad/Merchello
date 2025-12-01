export const manifests: Array<UmbExtensionManifest> = [
  // Workspace for root (when clicking "Merchello" in tree)
  {
    type: "workspace",
    kind: "default",
    alias: "Merchello.Root.Workspace",
    name: "Merchello Root Workspace",
    meta: {
      entityType: "merchello-root",
      headline: "Merchello",
    },
  },

  // Workspace for settings entity type
  {
    type: "workspace",
    kind: "default",
    alias: "Merchello.Settings.Workspace",
    name: "Merchello Settings Workspace",
    meta: {
      entityType: "merchello-settings",
      headline: "Settings",
    },
  },

  // Workspace view for settings
  {
    type: "workspaceView",
    alias: "Merchello.Settings.Workspace.View",
    name: "Merchello Settings View",
    js: () => import("./settings-workspace.element.js"),
    weight: 100,
    meta: {
      label: "Settings",
      pathname: "settings",
      icon: "icon-settings",
    },
    conditions: [
      {
        alias: "Umb.Condition.WorkspaceAlias",
        match: "Merchello.Settings.Workspace",
      },
    ],
  },
];
