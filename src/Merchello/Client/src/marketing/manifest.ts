export const manifests: Array<UmbExtensionManifest> = [
  // Workspace for marketing (when clicking "Marketing" in tree)
  {
    type: "workspace",
    kind: "default",
    alias: "Merchello.Marketing.Workspace",
    name: "Merchello Marketing Workspace",
    meta: {
      entityType: "merchello-marketing",
      headline: "Marketing",
    },
  },

  // Workspace view for marketing
  {
    type: "workspaceView",
    alias: "Merchello.Marketing.Workspace.View",
    name: "Merchello Marketing View",
    js: () => import("./marketing-workspace.element.js"),
    weight: 100,
    meta: {
      label: "Marketing",
      pathname: "marketing",
      icon: "icon-megaphone",
    },
    conditions: [
      {
        alias: "Umb.Condition.WorkspaceAlias",
        match: "Merchello.Marketing.Workspace",
      },
    ],
  },
];

