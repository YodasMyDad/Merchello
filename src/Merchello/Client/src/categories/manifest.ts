export const manifests: Array<UmbExtensionManifest> = [
  // Workspace for categories (when clicking "Categories" in tree)
  {
    type: "workspace",
    kind: "default",
    alias: "Merchello.Categories.Workspace",
    name: "Merchello Categories Workspace",
    meta: {
      entityType: "merchello-categories",
      headline: "Categories",
    },
  },

  // Workspace view for categories
  {
    type: "workspaceView",
    alias: "Merchello.Categories.Workspace.View",
    name: "Merchello Categories View",
    js: () => import("./components/categories-workspace.element.js"),
    weight: 100,
    meta: {
      label: "Categories",
      pathname: "categories",
      icon: "icon-tag",
    },
    conditions: [
      {
        alias: "Umb.Condition.WorkspaceAlias",
        match: "Merchello.Categories.Workspace",
      },
    ],
  },

  // Category picker modal (for discount targeting)
  {
    type: "modal",
    alias: "Merchello.CategoryPicker.Modal",
    name: "Category Picker Modal",
    js: () => import("./modals/category-picker-modal.element.js"),
  },
];

