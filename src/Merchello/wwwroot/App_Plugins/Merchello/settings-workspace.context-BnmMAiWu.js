import { UmbContextBase as o } from "@umbraco-cms/backoffice/class-api";
import { UmbEntityContext as r } from "@umbraco-cms/backoffice/entity";
import { UMB_WORKSPACE_CONTEXT as s, UmbWorkspaceRouteManager as i } from "@umbraco-cms/backoffice/workspace";
import { M as e } from "./bundle.manifests-CML9JKrj.js";
const n = "Merchello.Root.Workspace";
class E extends o {
  constructor(t) {
    super(t, s.toString()), this.workspaceAlias = n, this.#t = new r(this), this.#t.setEntityType(e), this.#t.setUnique("root"), this.routes = new i(t), this.routes.setRoutes([
      {
        path: "edit/:unique",
        component: () => import("./settings-workspace-editor.element-kNNm7l1O.js"),
        setup: () => {
        }
      },
      {
        path: "",
        redirectTo: "edit/root"
      }
    ]);
  }
  #t;
  getEntityType() {
    return e;
  }
  getUnique() {
    return "root";
  }
}
export {
  n as MERCHELLO_ROOT_WORKSPACE_ALIAS,
  E as MerchelloSettingsWorkspaceContext,
  E as api
};
//# sourceMappingURL=settings-workspace.context-BnmMAiWu.js.map
