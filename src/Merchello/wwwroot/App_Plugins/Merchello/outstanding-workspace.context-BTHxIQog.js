import { UmbContextBase as o } from "@umbraco-cms/backoffice/class-api";
import { UmbEntityContext as n } from "@umbraco-cms/backoffice/entity";
import { UMB_WORKSPACE_CONTEXT as s, UmbWorkspaceRouteManager as i } from "@umbraco-cms/backoffice/workspace";
import { o as e } from "./bundle.manifests-BZWDzHAH.js";
const r = "Merchello.Outstanding.Workspace";
class E extends o {
  constructor(t) {
    super(t, s.toString()), this.workspaceAlias = r, this.#t = new n(this), this.#t.setEntityType(e), this.#t.setUnique("outstanding"), this.routes = new i(t), this.routes.setRoutes([
      // Outstanding list route
      {
        path: "edit/outstanding",
        component: () => import("./outstanding-workspace-editor.element-Bl79wfH1.js"),
        setup: () => {
        }
      },
      // Default redirect
      {
        path: "",
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
  E as MerchelloOutstandingWorkspaceContext,
  E as api
};
//# sourceMappingURL=outstanding-workspace.context-BTHxIQog.js.map
