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

  // Workspace view for filters list
  {
    type: "workspaceView",
    alias: "Merchello.Filters.Workspace.View",
    name: "Merchello Filters View",
    js: () => import("./components/filters-list.element.js"),
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

  // Modal for creating/editing filter groups
  {
    type: "modal",
    alias: "Merchello.FilterGroup.Modal",
    name: "Merchello Filter Group Modal",
    js: () => import("./modals/filter-group-modal.element.js"),
  },

  // Modal for creating/editing filters
  {
    type: "modal",
    alias: "Merchello.Filter.Modal",
    name: "Merchello Filter Modal",
    js: () => import("./modals/filter-modal.element.js"),
  },

  // Filter picker modal (for discount targeting)
  {
    type: "modal",
    alias: "Merchello.FilterPicker.Modal",
    name: "Filter Picker Modal",
    js: () => import("./modals/filter-picker-modal.element.js"),
  },
];
