export const manifests: Array<UmbExtensionManifest> = [
  // Workspace for discounts list (when clicking "Discounts" in tree)
  {
    type: "workspace",
    kind: "default",
    alias: "Merchello.Discounts.Workspace",
    name: "Merchello Discounts Workspace",
    meta: {
      entityType: "merchello-discounts",
      headline: "Discounts",
    },
  },

  // Workspace view for discounts list
  {
    type: "workspaceView",
    alias: "Merchello.Discounts.Workspace.View",
    name: "Merchello Discounts View",
    js: () => import("./components/discounts-list.element.js"),
    weight: 100,
    meta: {
      label: "Discounts",
      pathname: "discounts",
      icon: "icon-tag",
    },
    conditions: [
      {
        alias: "Umb.Condition.WorkspaceAlias",
        match: "Merchello.Discounts.Workspace",
      },
    ],
  },

  // Routable workspace for discount detail (create/edit)
  {
    type: "workspace",
    kind: "routable",
    alias: "Merchello.Discount.Detail.Workspace",
    name: "Discount Detail Workspace",
    api: () => import("./contexts/discount-detail-workspace.context.js"),
    meta: {
      entityType: "merchello-discount",
    },
  },

  // Select discount type modal
  {
    type: "modal",
    alias: "Merchello.SelectDiscountType.Modal",
    name: "Select Discount Type Modal",
    js: () => import("./modals/select-discount-type-modal.element.js"),
  },
];
