export const manifests: Array<UmbExtensionManifest> = [
  // ============================================
  // Tax Workspace
  // ============================================

  // Workspace for tax (when clicking "Tax" in tree)
  {
    type: "workspace",
    kind: "default",
    alias: "Merchello.Tax.Workspace",
    name: "Merchello Tax Workspace",
    meta: {
      entityType: "merchello-tax",
      headline: "Tax Groups",
    },
  },

  // Workspace view for tax groups list
  {
    type: "workspaceView",
    alias: "Merchello.Tax.Workspace.View",
    name: "Merchello Tax Groups View",
    js: () => import("./tax-workspace.element.js"),
    weight: 100,
    meta: {
      label: "Tax Groups",
      pathname: "tax-groups",
      icon: "icon-calculator",
    },
    conditions: [
      {
        alias: "Umb.Condition.WorkspaceAlias",
        match: "Merchello.Tax.Workspace",
      },
    ],
  },

  // ============================================
  // Modals
  // ============================================

  // Tax group modal (handles both create and edit)
  {
    type: "modal",
    alias: "Merchello.TaxGroup.Modal",
    name: "Merchello Tax Group Modal",
    js: () => import("./modals/tax-group-modal.element.js"),
  },
];
