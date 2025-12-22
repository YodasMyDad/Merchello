
export const manifests: Array<UmbExtensionManifest> = [
  // Workspace for collections (when clicking "Collections" in tree)
  {
    type: "workspace",
    kind: "default",
    alias: "Merchello.Collections.Workspace",
    name: "Merchello Collections Workspace",
    meta: {
      entityType: "merchello-collections",
      headline: "Collections",
    },
  },

  // Workspace view for collections
  {
    type: "workspaceView",
    alias: "Merchello.Collections.Workspace.View",
    name: "Merchello Collections View",
    js: () => import("./components/collections-workspace.element.js"),
    weight: 100,
    meta: {
      label: "Collections",
      pathname: "collections",
      icon: "icon-tag",
    },
    conditions: [
      {
        alias: "Umb.Condition.WorkspaceAlias",
        match: "Merchello.Collections.Workspace",
      },
    ],
  },

  // Collection picker modal (for discount targeting)
  {
    type: "modal",
    alias: "Merchello.CollectionPicker.Modal",
    name: "Collection Picker Modal",
    js: () => import("./modals/collection-picker-modal.element.js"),
  },

  // Collection create/edit modal
  {
    type: "modal",
    alias: "Merchello.Collection.Modal",
    name: "Collection Modal",
    js: () => import("./modals/collection-modal.element.js"),
  },
];

