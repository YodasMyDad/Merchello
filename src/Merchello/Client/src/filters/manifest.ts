export const manifests: Array<UmbExtensionManifest> = [
  // Workspace for filters (when clicking "Filters" in tree)
  {
    type: "workspace",
    kind: "default",
    alias: "Merchello.Filters.Workspace",
    name: "Merchello Filters Workspace",
    meta: {
      entityType: "merchello-filters",
      headline: "Filters",
    },
  },

  // Workspace view for filters
  {
    type: "workspaceView",
    alias: "Merchello.Filters.Workspace.View",
    name: "Merchello Filters View",
    js: () => import("./filters-workspace.element.js"),
    weight: 100,
    meta: {
      label: "Filters",
      pathname: "filters",
      icon: "icon-filter",
    },
    conditions: [
      {
        alias: "Umb.Condition.WorkspaceAlias",
        match: "Merchello.Filters.Workspace",
      },
    ],
  },
];

