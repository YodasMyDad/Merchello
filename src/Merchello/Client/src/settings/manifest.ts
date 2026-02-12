
import { MERCHELLO_ROOT_ENTITY_TYPE } from "@tree/types/tree.types.js";

export const manifests: Array<UmbExtensionManifest> = [
  // Workspace for root (when clicking "Merchello" in tree)
  {
    type: "workspace",
    kind: "routable",
    alias: "Merchello.Root.Workspace",
    name: "Merchello Root Workspace",
    api: () => import("@settings/contexts/settings-workspace.context.js"),
    meta: {
      entityType: MERCHELLO_ROOT_ENTITY_TYPE,
    },
  },
  {
    type: "workspaceView",
    alias: "Merchello.Root.Workspace.View",
    name: "Merchello Root View",
    js: () => import("@settings/components/settings-workspace.element.js"),
    weight: 100,
    meta: {
      label: "Overview",
      pathname: "overview",
      icon: "icon-home",
    },
    conditions: [
      {
        alias: "Umb.Condition.WorkspaceAlias",
        match: "Merchello.Root.Workspace",
      },
    ],
  },
];
