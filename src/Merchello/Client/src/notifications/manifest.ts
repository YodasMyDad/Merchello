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
];
