import { UmbContextBase } from "@umbraco-cms/backoffice/class-api";
import { UmbEntityContext } from "@umbraco-cms/backoffice/entity";
import type { UmbRoutableWorkspaceContext } from "@umbraco-cms/backoffice/workspace";
import {
  UMB_WORKSPACE_CONTEXT,
  UmbWorkspaceRouteManager,
} from "@umbraco-cms/backoffice/workspace";
import type { UmbControllerHost } from "@umbraco-cms/backoffice/controller-api";
import { MERCHELLO_PRODUCT_TYPES_ENTITY_TYPE } from "@tree/types/tree.types.js";

export const MERCHELLO_PRODUCT_TYPES_WORKSPACE_ALIAS = "Merchello.ProductTypes.Workspace";

export class MerchelloProductTypesWorkspaceContext
  extends UmbContextBase
  implements UmbRoutableWorkspaceContext
{
  readonly workspaceAlias = MERCHELLO_PRODUCT_TYPES_WORKSPACE_ALIAS;
  readonly routes: UmbWorkspaceRouteManager;

  #entityContext = new UmbEntityContext(this);

  constructor(host: UmbControllerHost) {
    super(host, UMB_WORKSPACE_CONTEXT.toString());

    this.#entityContext.setEntityType(MERCHELLO_PRODUCT_TYPES_ENTITY_TYPE);
    this.#entityContext.setUnique("product-types");

    this.routes = new UmbWorkspaceRouteManager(host);

    this.routes.setRoutes([
      {
        path: "edit/:unique",
        component: () =>
          import("../components/product-types-workspace-editor.element.js"),
        setup: (_component, _info) => {
          // Static workspace - no dynamic loading needed
        },
      },
      {
        path: "",
        redirectTo: "edit/product-types",
      },
    ]);
  }

  getEntityType(): string {
    return MERCHELLO_PRODUCT_TYPES_ENTITY_TYPE;
  }

  getUnique(): string {
    return "product-types";
  }
}

export { MerchelloProductTypesWorkspaceContext as api };
