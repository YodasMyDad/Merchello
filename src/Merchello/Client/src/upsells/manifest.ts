import { MERCHELLO_UPSELLS_ENTITY_TYPE } from "@tree/types/tree.types.js";

export const manifests: Array<UmbExtensionManifest> = [
  {
    type: "workspace",
    kind: "routable",
    alias: "Merchello.Upsells.Workspace",
    name: "Merchello Upsells Workspace",
    api: () => import("./contexts/upsells-workspace.context.js"),
    meta: {
      entityType: MERCHELLO_UPSELLS_ENTITY_TYPE,
    },
  },
  {
    type: "workspaceView",
    alias: "Merchello.Upsells.Workspace.View",
    name: "Merchello Upsells View",
    js: () => import("./components/upsells-list.element.js"),
    weight: 100,
    meta: {
      label: "Upsells",
      pathname: "upsells",
      icon: "icon-chart-curve",
    },
    conditions: [
      {
        alias: "Umb.Condition.WorkspaceAlias",
        match: "Merchello.Upsells.Workspace",
      },
    ],
  },
  {
    type: "modal",
    alias: "Merchello.CreateUpsell.Modal",
    name: "Create Upsell Modal",
    js: () => import("./modals/create-upsell-modal.element.js"),
  },
];
