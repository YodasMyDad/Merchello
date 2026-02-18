import { UmbContextBase } from "@umbraco-cms/backoffice/class-api";
import { UmbEntityContext } from "@umbraco-cms/backoffice/entity";
import type { UmbControllerHost } from "@umbraco-cms/backoffice/controller-api";
import type { UmbRoutableWorkspaceContext } from "@umbraco-cms/backoffice/workspace";
import {
  UMB_WORKSPACE_CONTEXT,
  UmbWorkspaceRouteManager,
} from "@umbraco-cms/backoffice/workspace";
import { MERCHELLO_PRODUCT_IMPORT_EXPORT_ENTITY_TYPE } from "@tree/types/tree.types.js";

export const MERCHELLO_PRODUCT_IMPORT_EXPORT_WORKSPACE_ALIAS =
  "Merchello.ProductImportExport.Workspace";

export class MerchelloProductImportExportWorkspaceContext
  extends UmbContextBase
  implements UmbRoutableWorkspaceContext
{
  readonly workspaceAlias = MERCHELLO_PRODUCT_IMPORT_EXPORT_WORKSPACE_ALIAS;
  readonly routes: UmbWorkspaceRouteManager;

  #entityContext = new UmbEntityContext(this);

  constructor(host: UmbControllerHost) {
    super(host, UMB_WORKSPACE_CONTEXT.toString());

    this.#entityContext.setEntityType(MERCHELLO_PRODUCT_IMPORT_EXPORT_ENTITY_TYPE);
    this.#entityContext.setUnique("import-export");

    this.routes = new UmbWorkspaceRouteManager(host);
    this.routes.setRoutes([
      {
        path: "edit/import-export",
        component: () =>
          import("@product-import-export/components/product-import-export-workspace-editor.element.js"),
        setup: () => {
          // Static workspace shell.
        },
      },
      {
        path: "",
        redirectTo: "edit/import-export",
      },
    ]);
  }

  getEntityType(): string {
    return MERCHELLO_PRODUCT_IMPORT_EXPORT_ENTITY_TYPE;
  }

  getUnique(): string {
    return "import-export";
  }
}

export { MerchelloProductImportExportWorkspaceContext as api };
