import { MERCHELLO_OUTSTANDING_ENTITY_TYPE } from "@tree/types/tree.types.js";

export const manifests: Array<UmbExtensionManifest> = [
  // Mark as paid modal
  {
    type: "modal",
    alias: "Merchello.MarkAsPaid.Modal",
    name: "Merchello Mark as Paid Modal",
    js: () => import("@outstanding/modals/mark-as-paid-modal.element.js"),
  },

  // Workspace for outstanding list (when clicking "Outstanding" in tree)
  {
    type: "workspace",
    kind: "routable",
    alias: "Merchello.Outstanding.Workspace",
    name: "Merchello Outstanding Workspace",
    api: () => import("@outstanding/contexts/outstanding-workspace.context.js"),
    meta: {
      entityType: MERCHELLO_OUTSTANDING_ENTITY_TYPE,
    },
  },

  // Workspace view - the outstanding list
  {
    type: "workspaceView",
    alias: "Merchello.Outstanding.ListView",
    name: "Outstanding List View",
    js: () => import("@outstanding/components/outstanding-list.element.js"),
    weight: 100,
    meta: {
      label: "Outstanding",
      pathname: "list",
      icon: "icon-timer",
    },
    conditions: [
      {
        alias: "Umb.Condition.WorkspaceAlias",
        match: "Merchello.Outstanding.Workspace",
      },
    ],
  },
];
