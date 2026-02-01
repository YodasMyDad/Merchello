import { UmbContextBase as r } from "@umbraco-cms/backoffice/class-api";
import { UmbEntityContext as o } from "@umbraco-cms/backoffice/entity";
import { UMB_WORKSPACE_CONTEXT as s, UmbWorkspaceRouteManager as i } from "@umbraco-cms/backoffice/workspace";
import { m as e } from "./bundle.manifests-fAWhUMJg.js";
const n = "Merchello.Providers.Workspace";
class R extends r {
  constructor(t) {
    super(t, s.toString()), this.workspaceAlias = n, this.#t = new o(this), this.#t.setEntityType(e), this.#t.setUnique("providers"), this.routes = new i(t), this.routes.setRoutes([
      {
        path: "edit/:unique",
        component: () => import("./providers-workspace-editor.element-DCh60Z8l.js"),
        setup: (m, a) => {
        }
      },
      {
        path: "",
        redirectTo: "edit/providers"
      }
    ]);
  }
  #t;
  getEntityType() {
    return e;
  }
  getUnique() {
    return "providers";
  }
}
export {
  n as MERCHELLO_PROVIDERS_WORKSPACE_ALIAS,
  R as MerchelloProvidersWorkspaceContext,
  R as api
};
//# sourceMappingURL=providers-workspace.context-DWLc9OtC.js.map
