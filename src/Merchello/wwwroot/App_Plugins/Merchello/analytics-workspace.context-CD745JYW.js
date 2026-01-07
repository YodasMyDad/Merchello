import { UmbContextBase as o } from "@umbraco-cms/backoffice/class-api";
import { UmbEntityContext as i } from "@umbraco-cms/backoffice/entity";
import { UMB_WORKSPACE_CONTEXT as s, UmbWorkspaceRouteManager as n } from "@umbraco-cms/backoffice/workspace";
import { i as e } from "./bundle.manifests-BeYhXq8T.js";
const r = "Merchello.Analytics.Workspace";
class y extends o {
  constructor(t) {
    super(t, s.toString()), this.workspaceAlias = r, this.#t = new i(this), this.#t.setEntityType(e), this.#t.setUnique("analytics"), this.routes = new n(t), this.routes.setRoutes([
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
  y as MerchelloAnalyticsWorkspaceContext,
  y as api
};
//# sourceMappingURL=analytics-workspace.context-CD745JYW.js.map
