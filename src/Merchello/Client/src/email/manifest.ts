import { MERCHELLO_EMAILS_ENTITY_TYPE } from "@tree/types/tree.types.js";

export const manifests: Array<UmbExtensionManifest> = [
  // Workspace for emails (when clicking "Emails" in tree)
  {
    type: "workspace",
    kind: "routable",
    alias: "Merchello.Emails.Workspace",
    name: "Merchello Emails Workspace",
    api: () => import("@email/contexts/email-workspace.context.js"),
    meta: {
      entityType: MERCHELLO_EMAILS_ENTITY_TYPE,
    },
  },

  // Workspace view - the email list
  {
    type: "workspaceView",
    alias: "Merchello.Emails.ListView",
    name: "Emails List View",
    js: () => import("@email/components/email-list.element.js"),
    weight: 100,
    meta: {
      label: "Emails",
      pathname: "list",
      icon: "icon-mailbox",
    },
    conditions: [
      {
        alias: "Umb.Condition.WorkspaceAlias",
        match: "Merchello.Emails.Workspace",
      },
    ],
  },

  // Email preview modal
  {
    type: "modal",
    alias: "Merchello.Email.Preview.Modal",
    name: "Email Preview Modal",
    js: () => import("@email/modals/email-preview-modal.element.js"),
  },
];
