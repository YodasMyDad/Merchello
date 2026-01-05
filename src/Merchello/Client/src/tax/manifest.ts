export const manifests: Array<UmbExtensionManifest> = [
  // ============================================
  // Tax Providers (under Providers workspace)
  // ============================================

  // Workspace view for tax providers list (appears as "Tax" tab in Providers workspace)
  {
    type: "workspaceView",
    alias: "Merchello.Providers.TaxProviders.View",
    name: "Tax Providers View",
    js: () => import("./components/tax-providers-list.element.js"),
    weight: 85,
    meta: {
      label: "Tax",
      pathname: "tax",
      icon: "icon-calculator",
    },
    conditions: [
      {
        alias: "Umb.Condition.WorkspaceAlias",
        match: "Merchello.Providers.Workspace",
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

  // Tax rate modal (handles both create and edit for geographic rates)
  {
    type: "modal",
    alias: "Merchello.TaxRate.Modal",
    name: "Merchello Tax Rate Modal",
    js: () => import("./modals/tax-rate-modal.element.js"),
  },

  // Tax provider config modal
  {
    type: "modal",
    alias: "Merchello.TaxProviderConfig.Modal",
    name: "Merchello Tax Provider Config Modal",
    js: () => import("./modals/tax-provider-config-modal.element.js"),
  },

  // Test tax provider modal
  {
    type: "modal",
    alias: "Merchello.TestTaxProvider.Modal",
    name: "Merchello Test Tax Provider Modal",
    js: () => import("./modals/test-tax-provider-modal.element.js"),
  },
];
