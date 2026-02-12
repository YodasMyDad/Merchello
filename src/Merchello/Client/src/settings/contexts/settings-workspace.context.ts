import type { UmbControllerHost } from "@umbraco-cms/backoffice/controller-api";
import { UmbContextBase } from "@umbraco-cms/backoffice/class-api";
import { UmbEntityContext } from "@umbraco-cms/backoffice/entity";
import type { UmbRoutableWorkspaceContext } from "@umbraco-cms/backoffice/workspace";
import { UMB_WORKSPACE_CONTEXT, UmbWorkspaceRouteManager } from "@umbraco-cms/backoffice/workspace";
import { MERCHELLO_ROOT_ENTITY_TYPE } from "@tree/types/tree.types.js";

export const MERCHELLO_ROOT_WORKSPACE_ALIAS = "Merchello.Root.Workspace";

export class MerchelloSettingsWorkspaceContext
  extends UmbContextBase
  implements UmbRoutableWorkspaceContext
{
  readonly workspaceAlias = MERCHELLO_ROOT_WORKSPACE_ALIAS;
  readonly routes: UmbWorkspaceRouteManager;
  #entityContext = new UmbEntityContext(this);

  constructor(host: UmbControllerHost) {
    super(host, UMB_WORKSPACE_CONTEXT.toString());

    this.#entityContext.setEntityType(MERCHELLO_ROOT_ENTITY_TYPE);
    this.#entityContext.setUnique("root");

    this.routes = new UmbWorkspaceRouteManager(host);
    this.routes.setRoutes([
      {
        path: "edit/:unique",
        component: () => import("@settings/components/settings-workspace-editor.element.js"),
        setup: () => {
          // Static workspace
        },
      },
      {
        path: "",
        redirectTo: "edit/root",
      },
    ]);
  }

  getEntityType(): string {
    return MERCHELLO_ROOT_ENTITY_TYPE;
  }

  getUnique(): string {
    return "root";
  }
}

export { MerchelloSettingsWorkspaceContext as api };
