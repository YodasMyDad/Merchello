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

  // Customer edit modal
  {
    type: "modal",
    alias: "Merchello.Customer.Edit.Modal",
    name: "Customer Edit Modal",
    js: () => import("./modals/customer-edit-modal.element.js"),
  },
];
