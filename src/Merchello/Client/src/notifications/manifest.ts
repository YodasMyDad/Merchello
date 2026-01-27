import { MERCHELLO_NOTIFICATIONS_ENTITY_TYPE } from "@tree/types/tree.types.js";

export const manifests: Array<UmbExtensionManifest> = [
  // Workspace for notifications (when clicking "Notifications" in tree)
  {
    type: "workspace",
    kind: "routable",
    alias: "Merchello.Notifications.Workspace",
    name: "Merchello Notifications Workspace",
    api: () => import("./contexts/notifications-workspace.context.js"),
    meta: {
      entityType: MERCHELLO_NOTIFICATIONS_ENTITY_TYPE,
    },
  },

  // Workspace view - the notifications list (rendered inside workspace editor shell)
  {
    type: "workspaceView",
    alias: "Merchello.Notifications.ListView",
    name: "Notifications List View",
    js: () => import("./components/notifications-list.element.js"),
    weight: 100,
    meta: {
      label: "Notifications",
      pathname: "list",
      icon: "icon-bell",
    },
    conditions: [
      {
        alias: "Umb.Condition.WorkspaceAlias",
        match: "Merchello.Notifications.Workspace",
      },
    ],
  },
];
