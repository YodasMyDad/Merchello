import { UmbContextBase as o } from "@umbraco-cms/backoffice/class-api";
import { UmbEntityContext as s } from "@umbraco-cms/backoffice/entity";
import { UMB_WORKSPACE_CONTEXT as i, UmbWorkspaceRouteManager as n } from "@umbraco-cms/backoffice/workspace";
import { h as e } from "./bundle.manifests-BN1Pqtvn.js";
const r = "Merchello.Analytics.Workspace";
class l extends o {
  constructor(t) {
    super(t, i.toString()), this.workspaceAlias = r, this.#t = new s(this), this.#t.setEntityType(e), this.#t.setUnique("analytics"), this.routes = new n(t), this.routes.setRoutes([
      {
        path: "edit/:unique",
        component: () => import("./analytics-workspace-editor.element-BL4leGkl.js"),
        setup: (p, c) => {
        }
      },
      {
        path: "",
        redirectTo: "edit/analytics"
      }
    ]);
  }
  #t;
  getEntityType() {
    return e;
  }
  getUnique() {
    return "analytics";
  }
}
export {
  r as MERCHELLO_ANALYTICS_WORKSPACE_ALIAS,
  l as MerchelloAnalyticsWorkspaceContext,
  l as api
};
//# sourceMappingURL=analytics-workspace.context-nI37muQi.js.map
