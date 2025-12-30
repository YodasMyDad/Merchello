
export const manifests: Array<UmbExtensionManifest> = [
  // Workspace view for payment providers (under Providers workspace)
  {
    type: "workspaceView",
    alias: "Merchello.Providers.PaymentProviders.View",
    name: "Payment Providers View",
    js: () => import("./components/payment-providers-list.element.js"),
    weight: 100,
    meta: {
      label: "Payments",
      pathname: "payments",
      icon: "icon-credit-card",
    },
    conditions: [
      {
        alias: "Umb.Condition.WorkspaceAlias",
        match: "Merchello.Providers.Workspace",
      },
    ],
  },

  // Modal for configuring a payment provider
  {
    type: "modal",
    alias: "Merchello.PaymentProvider.Config.Modal",
    name: "Payment Provider Configuration Modal",
    js: () => import("./modals/payment-provider-config-modal.element.js"),
  },

  // Modal for configuring payment methods within a provider
  {
    type: "modal",
    alias: "Merchello.PaymentMethods.Config.Modal",
    name: "Payment Methods Configuration Modal",
    js: () => import("./modals/payment-methods-config-modal.element.js"),
  },

  // Modal for displaying setup instructions
  {
    type: "modal",
    alias: "Merchello.SetupInstructions.Modal",
    name: "Setup Instructions Modal",
    js: () => import("./modals/setup-instructions-modal.element.js"),
  },

  // Modal for testing a payment provider
  {
    type: "modal",
    alias: "Merchello.TestPaymentProvider.Modal",
    name: "Test Payment Provider Modal",
    js: () => import("./modals/test-provider-modal.element.js"),
  },
];

