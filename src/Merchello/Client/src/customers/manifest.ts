export const manifests: Array<UmbExtensionManifest> = [
  // Workspace for customers (when clicking "Customers" in tree)
  {
    type: "workspace",
    kind: "default",
    alias: "Merchello.Customers.Workspace",
    name: "Merchello Customers Workspace",
    meta: {
      entityType: "merchello-customers",
      headline: "Customers",
    },
  },

  // Workspace view - the customers list
  {
    type: "workspaceView",
    alias: "Merchello.Customers.ListView",
    name: "Customers List View",
    js: () => import("./components/customers-list.element.js"),
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
    js: () => import("./components/segments-list.element.js"),
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

  // Routable workspace for segment detail (edit/create)
  {
    type: "workspace",
    kind: "routable",
    alias: "Merchello.CustomerSegment.Detail.Workspace",
    name: "Customer Segment Detail Workspace",
    api: () => import("./contexts/segment-detail-workspace.context.js"),
    meta: {
      entityType: "merchello-customer-segment",
    },
  },

  // Customer edit modal
  {
    type: "modal",
    alias: "Merchello.Customer.Edit.Modal",
    name: "Customer Edit Modal",
    js: () => import("./modals/customer-edit-modal.element.js"),
  },

  // Customer picker modal (for adding members to segments)
  {
    type: "modal",
    alias: "Merchello.CustomerPicker.Modal",
    name: "Customer Picker Modal",
    js: () => import("./modals/customer-picker-modal.element.js"),
  },

  // Segment picker modal (for discount eligibility)
  {
    type: "modal",
    alias: "Merchello.SegmentPicker.Modal",
    name: "Segment Picker Modal",
    js: () => import("./modals/segment-picker-modal.element.js"),
  },
];
