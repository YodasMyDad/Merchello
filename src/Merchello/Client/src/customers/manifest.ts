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

  // Workspace view for customers
  {
    type: "workspaceView",
    alias: "Merchello.Customers.Workspace.View",
    name: "Merchello Customers View",
    js: () => import("./customers-workspace.element.js"),
    weight: 100,
    meta: {
      label: "Customers",
      pathname: "customers",
      icon: "icon-users",
    },
    conditions: [
      {
        alias: "Umb.Condition.WorkspaceAlias",
        match: "Merchello.Customers.Workspace",
      },
    ],
  },
];

