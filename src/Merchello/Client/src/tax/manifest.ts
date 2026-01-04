import { MERCHELLO_TAX_ENTITY_TYPE } from "@tree/types/tree.types.js";

export const manifests: Array<UmbExtensionManifest> = [
  // ============================================
  // Tax Workspace
  // ============================================

  // Workspace for tax (when clicking "Tax" in tree)
  {
    type: "workspace",
    kind: "routable",
    alias: "Merchello.Tax.Workspace",
    name: "Merchello Tax Workspace",
    api: () => import("./contexts/tax-workspace.context.js"),
    meta: {
      entityType: MERCHELLO_TAX_ENTITY_TYPE,
    },
  },

  // Workspace view for tax groups list
  {
    type: "workspaceView",
    alias: "Merchello.Tax.Workspace.View",
    name: "Merchello Tax Groups View",
    js: () => import("./components/tax-workspace.element.js"),
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

  // Workspace view for tax providers
  {
    type: "workspaceView",
    alias: "Merchello.Tax.Providers.View",
    name: "Merchello Tax Providers View",
    js: () => import("./components/tax-providers-list.element.js"),
    weight: 90,
    meta: {
      label: "Providers",
      pathname: "providers",
      icon: "icon-server-alt",
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
