import { UmbContextBase } from "@umbraco-cms/backoffice/class-api";
import { UmbEntityContext } from "@umbraco-cms/backoffice/entity";
import type { UmbRoutableWorkspaceContext } from "@umbraco-cms/backoffice/workspace";
import {
  UMB_WORKSPACE_CONTEXT,
  UmbWorkspaceRouteManager,
} from "@umbraco-cms/backoffice/workspace";
import type { UmbControllerHost } from "@umbraco-cms/backoffice/controller-api";
import { MERCHELLO_SUPPLIERS_ENTITY_TYPE } from "@tree/types/tree.types.js";

export const MERCHELLO_SUPPLIERS_WORKSPACE_ALIAS = "Merchello.Suppliers.Workspace";

export class MerchelloSuppliersWorkspaceContext
  extends UmbContextBase
  implements UmbRoutableWorkspaceContext
{
  readonly workspaceAlias = MERCHELLO_SUPPLIERS_WORKSPACE_ALIAS;
  readonly routes: UmbWorkspaceRouteManager;

  #entityContext = new UmbEntityContext(this);

  constructor(host: UmbControllerHost) {
    super(host, UMB_WORKSPACE_CONTEXT.toString());

    this.#entityContext.setEntityType(MERCHELLO_SUPPLIERS_ENTITY_TYPE);
    this.#entityContext.setUnique("suppliers");

    this.routes = new UmbWorkspaceRouteManager(host);

    this.routes.setRoutes([
      {
        path: "edit/:unique",
        component: () =>
          import("../components/suppliers-workspace-editor.element.js"),
        setup: (_component, _info) => {
          // Static workspace - no dynamic loading needed
        },
      },
      {
        path: "",
        redirectTo: "edit/suppliers",
      },
    ]);
  }

  getEntityType(): string {
    return MERCHELLO_SUPPLIERS_ENTITY_TYPE;
  }

  getUnique(): string {
    return "suppliers";
  }
}

export { MerchelloSuppliersWorkspaceContext as api };
