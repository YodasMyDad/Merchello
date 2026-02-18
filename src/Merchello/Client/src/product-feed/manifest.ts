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
    js: () => import("@product-feed/components/product-feeds-list.element.js"),
    weight: 100,
    meta: {
      label: "Product Feeds",
      pathname: "product-feeds",
      icon: "icon-rss",
    },
    conditions: [
      {
        alias: "Umb.Condition.WorkspaceAlias",
        match: "Merchello.ProductFeed.Workspace",
      },
    ],
  },

  {
    type: "modal",
    alias: "Merchello.ProductFeed.Validation.Modal",
    name: "Product Feed Validation Modal",
    js: () => import("@product-feed/modals/product-feed-validation-modal.element.js"),
  },
];
