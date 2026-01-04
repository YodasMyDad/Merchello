import { MERCHELLO_ANALYTICS_ENTITY_TYPE } from "@tree/types/tree.types.js";

export const manifests: Array<UmbExtensionManifest> = [
  // Workspace for analytics (when clicking "Analytics" in tree)
  {
    type: "workspace",
    kind: "routable",
    alias: "Merchello.Analytics.Workspace",
    name: "Merchello Analytics Workspace",
    api: () => import("./contexts/analytics-workspace.context.js"),
    meta: {
      entityType: MERCHELLO_ANALYTICS_ENTITY_TYPE,
    },
  },

  // Workspace view for analytics
  {
    type: "workspaceView",
    alias: "Merchello.Analytics.Workspace.View",
    name: "Merchello Analytics View",
    js: () => import("./components/analytics-workspace.element.js"),
    weight: 100,
    meta: {
      label: "Analytics",
      pathname: "analytics",
      icon: "icon-chart-curve",
    },
    conditions: [
      {
        alias: "Umb.Condition.WorkspaceAlias",
        match: "Merchello.Analytics.Workspace",
      },
    ],
  },
];

