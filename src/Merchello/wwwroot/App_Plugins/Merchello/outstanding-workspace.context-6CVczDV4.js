import { UmbContextBase as o } from "@umbraco-cms/backoffice/class-api";
import { UmbEntityContext as n } from "@umbraco-cms/backoffice/entity";
import { UMB_WORKSPACE_CONTEXT as s, UmbWorkspaceRouteManager as i } from "@umbraco-cms/backoffice/workspace";
import { p as e } from "./bundle.manifests-D3kjG2F6.js";
const r = "Merchello.Outstanding.Workspace";
class m extends o {
  constructor(t) {
    super(t, s.toString()), this.workspaceAlias = r, this.#t = new n(this), this.#t.setEntityType(e), this.#t.setUnique("outstanding"), this.routes = new i(t), this.routes.setRoutes([
      // Outstanding list route
      {
        path: "edit/outstanding",
        component: () => import("./outstanding-workspace-editor.element-BA-tz-HE.js"),
        setup: () => {
        }
      },
      // Default redirect
      {
        path: "",
        redirectTo: "edit/outstanding"
      },
      // Catch-all redirect
      {
        path: "**",
        redirectTo: "edit/outstanding"
      }
    ]);
  }
  #t;
  getEntityType() {
    return e;
  }
  getUnique() {
    return "outstanding";
  }
}
export {
  r as MERCHELLO_OUTSTANDING_WORKSPACE_ALIAS,
  m as MerchelloOutstandingWorkspaceContext,
  m as api
};
//# sourceMappingURL=outstanding-workspace.context-6CVczDV4.js.map
