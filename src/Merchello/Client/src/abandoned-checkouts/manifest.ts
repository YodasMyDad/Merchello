import { MERCHELLO_ABANDONED_CHECKOUTS_ENTITY_TYPE } from "@tree/types/tree.types.js";

export const manifests: Array<UmbExtensionManifest> = [
  // Workspace for abandoned checkouts list (when clicking "Abandoned Checkouts" in tree)
  {
    type: "workspace",
    kind: "routable",
    alias: "Merchello.AbandonedCheckouts.Workspace",
    name: "Merchello Abandoned Checkouts Workspace",
    api: () => import("@abandoned-checkouts/contexts/abandoned-checkouts-workspace.context.js"),
    meta: {
      entityType: MERCHELLO_ABANDONED_CHECKOUTS_ENTITY_TYPE,
    },
  },

  // Workspace view - the abandoned checkouts list
  {
    type: "workspaceView",
    alias: "Merchello.AbandonedCheckouts.ListView",
    name: "Abandoned Checkouts List View",
    js: () => import("@abandoned-checkouts/components/abandoned-checkouts-list.element.js"),
    weight: 100,
    meta: {
      label: "Abandoned Checkouts",
      pathname: "list",
      icon: "icon-shopping-basket-alt-2",
    },
    conditions: [
      {
        alias: "Umb.Condition.WorkspaceAlias",
        match: "Merchello.AbandonedCheckouts.Workspace",
      },
    ],
  },

  // Detail modal (sidebar)
  {
    type: "modal",
    alias: "Merchello.AbandonedCheckout.Detail.Modal",
    name: "Abandoned Checkout Detail Modal",
    js: () => import("@abandoned-checkouts/modals/abandoned-checkout-detail-modal.element.js"),
  },
];
