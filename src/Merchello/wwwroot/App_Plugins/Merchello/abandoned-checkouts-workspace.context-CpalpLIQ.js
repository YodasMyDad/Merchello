import { UmbContextBase as o } from "@umbraco-cms/backoffice/class-api";
import { UmbEntityContext as n } from "@umbraco-cms/backoffice/entity";
import { UMB_WORKSPACE_CONTEXT as s, UmbWorkspaceRouteManager as r } from "@umbraco-cms/backoffice/workspace";
import { q as e } from "./bundle.manifests-kJtMcY8M.js";
const a = "Merchello.AbandonedCheckouts.Workspace";
class h extends o {
  constructor(t) {
    super(t, s.toString()), this.workspaceAlias = a, this.#t = new n(this), this.#t.setEntityType(e), this.#t.setUnique("abandoned-checkouts"), this.routes = new r(t), this.routes.setRoutes([
      // Abandoned checkouts list route
      {
        path: "edit/abandoned-checkouts",
        component: () => import("./abandoned-checkouts-workspace-editor.element-Dc45BHUn.js"),
        setup: () => {
        }
      },
      // Default redirect
      {
        path: "",
        redirectTo: "edit/abandoned-checkouts"
      }
    ]);
  }
  #t;
  getEntityType() {
    return e;
  }
  getUnique() {
    return "abandoned-checkouts";
  }
}
export {
  a as MERCHELLO_ABANDONED_CHECKOUTS_WORKSPACE_ALIAS,
  h as MerchelloAbandonedCheckoutsWorkspaceContext,
  h as api
};
//# sourceMappingURL=abandoned-checkouts-workspace.context-CpalpLIQ.js.map
