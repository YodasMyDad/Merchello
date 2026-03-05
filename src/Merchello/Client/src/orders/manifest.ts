import { MERCHELLO_ORDERS_ENTITY_TYPE } from "@tree/types/tree.types.js";

export const manifests: Array<UmbExtensionManifest> = [
  // Generic action sidebar modal for custom plugin actions
  {
    type: "modal",
    alias: "Merchello.ActionSidebar.Modal",
    name: "Merchello Action Sidebar Modal",
    js: () => import("@shared/modals/action-sidebar-modal.element.js"),
  },

  // Fulfillment modal for creating shipments
  {
    type: "modal",
    alias: "Merchello.Fulfillment.Modal",
    name: "Merchello Fulfillment Modal",
    js: () => import("@orders/modals/fulfillment-modal.element.js"),
  },

  // Shipment edit modal for updating tracking info
  {
    type: "modal",
    alias: "Merchello.ShipmentEdit.Modal",
    name: "Merchello Shipment Edit Modal",
    js: () => import("@orders/modals/shipment-edit-modal.element.js"),
  },

  // Manual payment modal for recording offline payments
  {
    type: "modal",
    alias: "Merchello.ManualPayment.Modal",
    name: "Merchello Manual Payment Modal",
    js: () => import("@orders/modals/manual-payment-modal.element.js"),
  },

  // Refund modal for processing refunds
  {
    type: "modal",
    alias: "Merchello.Refund.Modal",
    name: "Merchello Refund Modal",
    js: () => import("@orders/modals/refund-modal.element.js"),
  },

  // Cancel invoice modal for cancelling invoices
  {
    type: "modal",
    alias: "Merchello.CancelInvoice.Modal",
    name: "Merchello Cancel Invoice Modal",
    js: () => import("@orders/modals/cancel-invoice-modal.element.js"),
  },

  // Export modal for exporting orders to CSV
  {
    type: "modal",
    alias: "Merchello.Export.Modal",
    name: "Merchello Export Modal",
    js: () => import("@orders/modals/export-modal.element.js"),
  },

  // Edit order modal for editing order details
  {
    type: "modal",
    alias: "Merchello.EditOrder.Modal",
    name: "Merchello Edit Order Modal",
    js: () => import("@orders/modals/edit-order-modal.element.js"),
  },

  // Add custom item modal for edit order
  {
    type: "modal",
    alias: "Merchello.AddCustomItem.Modal",
    name: "Merchello Add Custom Item Modal",
    js: () => import("@orders/modals/add-custom-item-modal.element.js"),
  },

  // Add discount modal for edit order
  {
    type: "modal",
    alias: "Merchello.AddDiscount.Modal",
    name: "Merchello Add Discount Modal",
    js: () => import("@orders/modals/add-discount-modal.element.js"),
  },

  // Create order modal for creating manual orders from backoffice
  {
    type: "modal",
    alias: "Merchello.CreateOrder.Modal",
    name: "Merchello Create Order Modal",
    js: () => import("@orders/modals/create-order-modal.element.js"),
  },

  // Customer orders modal for viewing all orders by a customer
  {
    type: "modal",
    alias: "Merchello.CustomerOrders.Modal",
    name: "Merchello Customer Orders Modal",
    js: () => import("@orders/modals/customer-orders-modal.element.js"),
  },

  // Generate statement modal for downloading customer statement PDFs
  {
    type: "modal",
    alias: "Merchello.GenerateStatement.Modal",
    name: "Merchello Generate Statement Modal",
    js: () => import("@orders/modals/generate-statement-modal.element.js"),
  },

  // Workspace for orders list (when clicking "Orders" in tree)
  {
    type: "workspace",
    kind: "routable",
    alias: "Merchello.Orders.Workspace",
    name: "Merchello Orders Workspace",
    api: () => import("@orders/contexts/orders-workspace.context.js"),
    meta: {
      entityType: MERCHELLO_ORDERS_ENTITY_TYPE,
    },
  },

  // Workspace view - the orders list (used when on list route)
  {
    type: "workspaceView",
    alias: "Merchello.Orders.ListView",
    name: "Orders List View",
    js: () => import("@orders/components/orders-list.element.js"),
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
];
