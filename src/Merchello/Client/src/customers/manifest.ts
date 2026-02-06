import { MERCHELLO_CUSTOMERS_ENTITY_TYPE } from "@tree/types/tree.types.js";

export const manifests: Array<UmbExtensionManifest> = [
  // Workspace for customers (when clicking "Customers" in tree)
  {
    type: "workspace",
    kind: "routable",
    alias: "Merchello.Customers.Workspace",
    name: "Merchello Customers Workspace",
    api: () => import("@customers/contexts/customers-workspace.context.js"),
    meta: {
      entityType: MERCHELLO_CUSTOMERS_ENTITY_TYPE,
    },
  },

  // Workspace view - the customers list
  {
    type: "workspaceView",
    alias: "Merchello.Customers.ListView",
    name: "Customers List View",
    js: () => import("@customers/components/customers-list.element.js"),
    weight: 100,
    meta: {
      label: "Customers",
      pathname: "list",
      icon: "icon-users",
    },
    conditions: [
      {
        alias: "Umb.Condition.WorkspaceAlias",
        match: "Merchello.Customers.Workspace",
      },
    ],
  },

  // Workspace view - the segments list (tab in Customers workspace)
  {
    type: "workspaceView",
    alias: "Merchello.Customers.SegmentsView",
    name: "Customer Segments View",
    js: () => import("@customers/components/segments-list.element.js"),
    weight: 90,
    meta: {
      label: "Segments",
      pathname: "segments",
      icon: "icon-filter",
    },
    conditions: [
      {
        alias: "Umb.Condition.WorkspaceAlias",
        match: "Merchello.Customers.Workspace",
      },
    ],
  },

  // Customer edit modal
  {
    type: "modal",
    alias: "Merchello.Customer.Edit.Modal",
    name: "Customer Edit Modal",
    js: () => import("@customers/modals/customer-edit-modal.element.js"),
  },

  // Customer picker modal (for adding members to segments)
  {
    type: "modal",
    alias: "Merchello.CustomerPicker.Modal",
    name: "Customer Picker Modal",
    js: () => import("@customers/modals/customer-picker-modal.element.js"),
  },

  // Segment picker modal (for discount eligibility)
  {
    type: "modal",
    alias: "Merchello.SegmentPicker.Modal",
    name: "Segment Picker Modal",
    js: () => import("@customers/modals/segment-picker-modal.element.js"),
  },
];
