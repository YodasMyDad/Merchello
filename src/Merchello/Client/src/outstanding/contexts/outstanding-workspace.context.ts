import { UmbContextBase } from "@umbraco-cms/backoffice/class-api";
import { UmbEntityContext } from "@umbraco-cms/backoffice/entity";
import type { UmbRoutableWorkspaceContext } from "@umbraco-cms/backoffice/workspace";
import {
  UMB_WORKSPACE_CONTEXT,
  UmbWorkspaceRouteManager,
} from "@umbraco-cms/backoffice/workspace";
import type { UmbControllerHost } from "@umbraco-cms/backoffice/controller-api";
import { MERCHELLO_OUTSTANDING_ENTITY_TYPE } from "@tree/types/tree.types.js";

export const MERCHELLO_OUTSTANDING_WORKSPACE_ALIAS = "Merchello.Outstanding.Workspace";

/**
 * Workspace context for outstanding invoices - handles the outstanding list view.
 */
export class MerchelloOutstandingWorkspaceContext
  extends UmbContextBase
  implements UmbRoutableWorkspaceContext
{
  readonly workspaceAlias = MERCHELLO_OUTSTANDING_WORKSPACE_ALIAS;
  readonly routes: UmbWorkspaceRouteManager;

  #entityContext = new UmbEntityContext(this);

  constructor(host: UmbControllerHost) {
    super(host, UMB_WORKSPACE_CONTEXT.toString());

    this.#entityContext.setEntityType(MERCHELLO_OUTSTANDING_ENTITY_TYPE);
    this.#entityContext.setUnique("outstanding");

    this.routes = new UmbWorkspaceRouteManager(host);

    this.routes.setRoutes([
      // Outstanding list route
      {
        path: "edit/outstanding",
        component: () => import("@outstanding/components/outstanding-workspace-editor.element.js"),
        setup: () => {
          // No specific setup needed for list view
        },
      },
      // Default redirect
      {
        path: "",
        redirectTo: "edit/outstanding",
      },
      // Catch-all redirect
      {
        path: "**",
        redirectTo: "edit/outstanding",
      },
    ]);
  }

  getEntityType(): string {
    return MERCHELLO_OUTSTANDING_ENTITY_TYPE;
  }

  getUnique(): string | undefined {
    return "outstanding";
  }
}

export { MerchelloOutstandingWorkspaceContext as api };
