export const manifests: Array<UmbExtensionManifest> = [
  // Fulfillment modal for creating shipments
  {
    type: "modal",
    alias: "Merchello.Fulfillment.Modal",
    name: "Merchello Fulfillment Modal",
    js: () => import("./modals/fulfillment-modal.element.js"),
  },

  // Shipment edit modal for updating tracking info
  {
    type: "modal",
    alias: "Merchello.ShipmentEdit.Modal",
    name: "Merchello Shipment Edit Modal",
    js: () => import("./modals/shipment-edit-modal.element.js"),
  },

  // Manual payment modal for recording offline payments
  {
    type: "modal",
    alias: "Merchello.ManualPayment.Modal",
    name: "Merchello Manual Payment Modal",
    js: () => import("./modals/manual-payment-modal.element.js"),
  },

  // Refund modal for processing refunds
  {
    type: "modal",
    alias: "Merchello.Refund.Modal",
    name: "Merchello Refund Modal",
    js: () => import("./modals/refund-modal.element.js"),
  },

  // Workspace for orders list (when clicking "Orders" in tree)
  {
    type: "workspace",
    kind: "default",
    alias: "Merchello.Orders.Workspace",
    name: "Merchello Orders Workspace",
    meta: {
      entityType: "merchello-orders",
      headline: "Orders",
    },
  },

  // Workspace view - the orders list
  {
    type: "workspaceView",
    alias: "Merchello.Orders.ListView",
    name: "Orders List View",
    js: () => import("./components/orders-list.element.js"),
    weight: 100,
    meta: {
      label: "Orders",
      pathname: "list",
      icon: "icon-list",
    },
    conditions: [
      {
        alias: "Umb.Condition.WorkspaceAlias",
        match: "Merchello.Orders.Workspace",
      },
    ],
  },

  // Workspace for individual order detail (routable)
  {
    type: "workspace",
    kind: "routable",
    alias: "Merchello.Order.Detail.Workspace",
    name: "Order Detail Workspace",
    api: () => import("./contexts/order-detail-workspace.context.js"),
    meta: {
      entityType: "merchello-order",
    },
  },
];
