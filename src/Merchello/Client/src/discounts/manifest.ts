import { MERCHELLO_DISCOUNTS_ENTITY_TYPE } from "@tree/types/tree.types.js";

export const manifests: Array<UmbExtensionManifest> = [
  // Workspace for discounts list (when clicking "Discounts" in tree)
  {
    type: "workspace",
    kind: "routable",
    alias: "Merchello.Discounts.Workspace",
    name: "Merchello Discounts Workspace",
    api: () => import("./contexts/discounts-workspace.context.js"),
    meta: {
      entityType: MERCHELLO_DISCOUNTS_ENTITY_TYPE,
    },
  },

  // Workspace view for discounts list (used when on list route)
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

  // Select discount type modal
  {
    type: "modal",
    alias: "Merchello.SelectDiscountType.Modal",
    name: "Select Discount Type Modal",
    js: () => import("./modals/select-discount-type-modal.element.js"),
  },
];
