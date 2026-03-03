import { UmbContextBase as s } from "@umbraco-cms/backoffice/class-api";
import { UmbEntityContext as r } from "@umbraco-cms/backoffice/entity";
import { UMB_WORKSPACE_CONTEXT as o, UmbWorkspaceRouteManager as i } from "@umbraco-cms/backoffice/workspace";
import { j as e } from "./bundle.manifests-Bd6-EHC8.js";
const p = "Merchello.Suppliers.Workspace";
class h extends s {
  constructor(t) {
    super(t, o.toString()), this.workspaceAlias = p, this.#t = new r(this), this.#t.setEntityType(e), this.#t.setUnique("suppliers"), this.routes = new i(t), this.routes.setRoutes([
      {
        path: "edit/:unique",
        component: () => import("./suppliers-workspace-editor.element-BEmemcpw.js"),
        setup: (u, a) => {
        }
      },
      {
        path: "",
        redirectTo: "edit/suppliers"
      }
    ]);
  }
  #t;
  getEntityType() {
    return e;
  }
  getUnique() {
    return "suppliers";
  }
}
export {
  p as MERCHELLO_SUPPLIERS_WORKSPACE_ALIAS,
  h as MerchelloSuppliersWorkspaceContext,
  h as api
};
//# sourceMappingURL=suppliers-workspace.context-CC_osvEo.js.map
