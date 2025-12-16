export const manifests: Array<UmbExtensionManifest> = [
  // Workspace for product feed (when clicking "Product Feed" in tree)
  {
    type: "workspace",
    kind: "default",
    alias: "Merchello.ProductFeed.Workspace",
    name: "Merchello Product Feed Workspace",
    meta: {
      entityType: "merchello-product-feed",
      headline: "Product Feed",
    },
  },

  // Workspace view for product feed
  {
    type: "workspaceView",
    alias: "Merchello.ProductFeed.Workspace.View",
    name: "Merchello Product Feed View",
    js: () => import("./product-feed-workspace.element.js"),
    weight: 100,
    meta: {
      label: "Product Feed",
      pathname: "product-feed",
      icon: "icon-rss",
    },
    conditions: [
      {
        alias: "Umb.Condition.WorkspaceAlias",
        match: "Merchello.ProductFeed.Workspace",
      },
    ],
  },
];
