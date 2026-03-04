import { UmbContextBase as o } from "@umbraco-cms/backoffice/class-api";
import { UmbEntityContext as r } from "@umbraco-cms/backoffice/entity";
import { UMB_WORKSPACE_CONTEXT as p, UmbWorkspaceRouteManager as i } from "@umbraco-cms/backoffice/workspace";
import { s as e } from "./bundle.manifests-D3kjG2F6.js";
const s = "Merchello.ProductImportExport.Workspace";
class T extends o {
  constructor(t) {
    super(t, p.toString()), this.workspaceAlias = s, this.#t = new r(this), this.#t.setEntityType(e), this.#t.setUnique("import-export"), this.routes = new i(t), this.routes.setRoutes([
      {
        path: "edit/import-export",
        component: () => import("./product-import-export-workspace-editor.element-CyyX2u_h.js"),
        setup: () => {
        }
      },
      {
        path: "",
        redirectTo: "edit/import-export"
      }
    ]);
  }
  #t;
  getEntityType() {
    return e;
  }
  getUnique() {
    return "import-export";
  }
}
export {
  s as MERCHELLO_PRODUCT_IMPORT_EXPORT_WORKSPACE_ALIAS,
  T as MerchelloProductImportExportWorkspaceContext,
  T as api
};
//# sourceMappingURL=product-import-export-workspace.context-C6hydfVg.js.map
