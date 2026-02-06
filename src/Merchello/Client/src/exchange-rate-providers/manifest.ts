
export const manifests: Array<UmbExtensionManifest> = [
  // Workspace view for exchange rate providers (under Providers workspace)
  {
    type: "workspaceView",
    alias: "Merchello.Providers.ExchangeRateProviders.View",
    name: "Exchange Rate Providers View",
    js: () => import("@exchange-rate-providers/components/exchange-rate-providers-list.element.js"),
    weight: 80, // After Payments (100) and Shipping (90)
    meta: {
      label: "Exchange Rates",
      pathname: "exchange-rates",
      icon: "icon-globe",
    },
    conditions: [
      {
        alias: "Umb.Condition.WorkspaceAlias",
        match: "Merchello.Providers.Workspace",
      },
    ],
  },

  // Modal for configuring an exchange rate provider
  {
    type: "modal",
    alias: "Merchello.ExchangeRateProvider.Config.Modal",
    name: "Exchange Rate Provider Configuration Modal",
    js: () => import("@exchange-rate-providers/modals/exchange-rate-provider-config-modal.element.js"),
  },

  // Modal for testing an exchange rate provider
  {
    type: "modal",
    alias: "Merchello.ExchangeRateProvider.Test.Modal",
    name: "Exchange Rate Provider Test Modal",
    js: () => import("@exchange-rate-providers/modals/test-provider-modal.element.js"),
  },
];
