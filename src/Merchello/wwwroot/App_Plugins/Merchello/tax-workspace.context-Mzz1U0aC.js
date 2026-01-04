import { UmbContextBase as o } from "@umbraco-cms/backoffice/class-api";
import { UmbEntityContext as r } from "@umbraco-cms/backoffice/entity";
import { UMB_WORKSPACE_CONTEXT as s, UmbWorkspaceRouteManager as i } from "@umbraco-cms/backoffice/workspace";
import { j as e } from "./bundle.manifests-e1Lo7CbL.js";
const n = "Merchello.Tax.Workspace";
class x extends o {
  constructor(t) {
    super(t, s.toString()), this.workspaceAlias = n, this.#t = new r(this), this.#t.setEntityType(e), this.#t.setUnique("tax"), this.routes = new i(t), this.routes.setRoutes([
      {
        path: "edit/:unique",
        component: () => import("./tax-workspace-editor.element-0wIaEmNO.js"),
        setup: (p, m) => {
        }
      },
      {
        path: "",
        redirectTo: "edit/tax"
      }
    ]);
  }
  #t;
  getEntityType() {
    return e;
  }
  getUnique() {
    return "tax";
  }
}
export {
  n as MERCHELLO_TAX_WORKSPACE_ALIAS,
  x as MerchelloTaxWorkspaceContext,
  x as api
};
//# sourceMappingURL=tax-workspace.context-Mzz1U0aC.js.map
