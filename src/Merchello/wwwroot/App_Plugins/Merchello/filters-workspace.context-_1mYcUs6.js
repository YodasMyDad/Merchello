import { UmbContextBase as r } from "@umbraco-cms/backoffice/class-api";
import { UmbEntityContext as o } from "@umbraco-cms/backoffice/entity";
import { UMB_WORKSPACE_CONTEXT as s, UmbWorkspaceRouteManager as i } from "@umbraco-cms/backoffice/workspace";
import { e } from "./bundle.manifests-fAWhUMJg.js";
const n = "Merchello.Filters.Workspace";
class h extends r {
  constructor(t) {
    super(t, s.toString()), this.workspaceAlias = n, this.#t = new o(this), this.#t.setEntityType(e), this.#t.setUnique("filters"), this.routes = new i(t), this.routes.setRoutes([
      {
        path: "edit/:unique",
        component: () => import("./filters-workspace-editor.element-BYwVb0NN.js"),
        setup: (a, m) => {
        }
      },
      {
        path: "",
        redirectTo: "edit/filters"
      }
    ]);
  }
  #t;
  getEntityType() {
    return e;
  }
  getUnique() {
    return "filters";
  }
}
export {
  n as MERCHELLO_FILTERS_WORKSPACE_ALIAS,
  h as MerchelloFiltersWorkspaceContext,
  h as api
};
//# sourceMappingURL=filters-workspace.context-_1mYcUs6.js.map
