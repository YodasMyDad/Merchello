export const manifests: Array<UmbExtensionManifest> = [
  // Workspace view for address lookup providers (under Providers workspace)
  {
    type: "workspaceView",
    alias: "Merchello.Providers.AddressLookupProviders.View",
    name: "Address Lookup Providers View",
    js: () => import("./components/address-lookup-providers-list.element.js"),
    weight: 85,
    meta: {
      label: "Address Lookup",
      pathname: "address-lookup",
      icon: "icon-map-location",
    },
    conditions: [
      {
        alias: "Umb.Condition.WorkspaceAlias",
        match: "Merchello.Providers.Workspace",
      },
    ],
  },

  // Modal for configuring an address lookup provider
  {
    type: "modal",
    alias: "Merchello.AddressLookupProvider.Config.Modal",
    name: "Address Lookup Provider Configuration Modal",
    js: () => import("./modals/address-lookup-provider-config-modal.element.js"),
  },

  // Modal for testing an address lookup provider
  {
    type: "modal",
    alias: "Merchello.AddressLookupProvider.Test.Modal",
    name: "Address Lookup Provider Test Modal",
    js: () => import("./modals/test-provider-modal.element.js"),
  },
];
