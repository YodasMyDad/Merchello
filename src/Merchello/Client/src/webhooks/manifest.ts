import { MERCHELLO_WEBHOOKS_ENTITY_TYPE } from "@tree/types/tree.types.js";

export const manifests: Array<UmbExtensionManifest> = [
  // Workspace for webhooks (when clicking "Webhooks" in tree)
  {
    type: "workspace",
    kind: "routable",
    alias: "Merchello.Webhooks.Workspace",
    name: "Merchello Webhooks Workspace",
    api: () => import("@webhooks/contexts/webhooks-workspace.context.js"),
    meta: {
      entityType: MERCHELLO_WEBHOOKS_ENTITY_TYPE,
    },
  },

  // Workspace view - the webhooks list
  {
    type: "workspaceView",
    alias: "Merchello.Webhooks.ListView",
    name: "Webhooks List View",
    js: () => import("@webhooks/components/webhooks-list.element.js"),
    weight: 100,
    meta: {
      label: "Webhooks",
      pathname: "list",
      icon: "icon-link",
    },
    conditions: [
      {
        alias: "Umb.Condition.WorkspaceAlias",
        match: "Merchello.Webhooks.Workspace",
      },
    ],
  },

  // Webhook subscription create/edit modal
  {
    type: "modal",
    alias: "Merchello.Webhook.Subscription.Modal",
    name: "Webhook Subscription Modal",
    js: () => import("@webhooks/modals/webhook-subscription-modal.element.js"),
  },

  // Webhook test modal
  {
    type: "modal",
    alias: "Merchello.Webhook.Test.Modal",
    name: "Webhook Test Modal",
    js: () => import("@webhooks/modals/webhook-test-modal.element.js"),
  },

  // Delivery detail modal
  {
    type: "modal",
    alias: "Merchello.Webhook.Delivery.Modal",
    name: "Webhook Delivery Detail Modal",
    js: () => import("@webhooks/modals/delivery-detail-modal.element.js"),
  },

  // Integration guide modal
  {
    type: "modal",
    alias: "Merchello.WebhookIntegrationGuide.Modal",
    name: "Webhook Integration Guide Modal",
    js: () => import("@webhooks/modals/webhook-integration-guide-modal.element.js"),
  },
];
