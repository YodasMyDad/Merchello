import { UmbContextBase } from "@umbraco-cms/backoffice/class-api";
import { UmbEntityContext } from "@umbraco-cms/backoffice/entity";
import type { UmbRoutableWorkspaceContext } from "@umbraco-cms/backoffice/workspace";
import {
  UMB_WORKSPACE_CONTEXT,
  UmbWorkspaceRouteManager,
} from "@umbraco-cms/backoffice/workspace";
import type { UmbControllerHost } from "@umbraco-cms/backoffice/controller-api";
import { MERCHELLO_ABANDONED_CHECKOUTS_ENTITY_TYPE } from "@tree/types/tree.types.js";
import { MerchelloTreeExpansionController } from "@tree/services/tree-expansion.controller.js";

export const MERCHELLO_ABANDONED_CHECKOUTS_WORKSPACE_ALIAS = "Merchello.AbandonedCheckouts.Workspace";

/**
 * Workspace context for abandoned checkouts - handles the abandoned checkouts list view.
 */
export class MerchelloAbandonedCheckoutsWorkspaceContext
  extends UmbContextBase
  implements UmbRoutableWorkspaceContext
{
  readonly workspaceAlias = MERCHELLO_ABANDONED_CHECKOUTS_WORKSPACE_ALIAS;
  readonly routes: UmbWorkspaceRouteManager;

  #entityContext = new UmbEntityContext(this);

  constructor(host: UmbControllerHost) {
    super(host, UMB_WORKSPACE_CONTEXT.toString());

    this.#entityContext.setEntityType(MERCHELLO_ABANDONED_CHECKOUTS_ENTITY_TYPE);
    this.#entityContext.setUnique("abandoned-checkouts");

    new MerchelloTreeExpansionController(this, MERCHELLO_ABANDONED_CHECKOUTS_ENTITY_TYPE, "abandoned-checkouts");

    this.routes = new UmbWorkspaceRouteManager(host);

    this.routes.setRoutes([
      // Abandoned checkouts list route
      {
        path: "edit/abandoned-checkouts",
        component: () => import("@abandoned-checkouts/components/abandoned-checkouts-workspace-editor.element.js"),
        setup: () => {
          // No specific setup needed for list view
        },
      },
      // Default redirect
      {
        path: "",
        redirectTo: "edit/abandoned-checkouts",
      },
    ]);
  }

  getEntityType(): string {
    return MERCHELLO_ABANDONED_CHECKOUTS_ENTITY_TYPE;
  }

  getUnique(): string | undefined {
    return "abandoned-checkouts";
  }
}

export { MerchelloAbandonedCheckoutsWorkspaceContext as api };
