import { MERCHELLO_PRODUCT_FEED_ENTITY_TYPE } from "@tree/types/tree.types.js";

export const manifests: Array<UmbExtensionManifest> = [
  // Workspace for product feed (when clicking "Product Feed" in tree)
  {
    type: "workspace",
    kind: "routable",
    alias: "Merchello.ProductFeed.Workspace",
    name: "Merchello Product Feed Workspace",
    api: () => import("@product-feed/contexts/product-feed-workspace.context.js"),
    meta: {
      entityType: MERCHELLO_PRODUCT_FEED_ENTITY_TYPE,
    },
  },

  // Workspace view for product feed
  {
    type: "workspaceView",
    alias: "Merchello.ProductFeed.Workspace.View",
    name: "Merchello Product Feed View",
    js: () => import("@product-feed/components/product-feed-workspace.element.js"),
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
