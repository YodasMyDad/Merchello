import { UmbContextBase as o } from "@umbraco-cms/backoffice/class-api";
import { UmbEntityContext as s } from "@umbraco-cms/backoffice/entity";
import { UMB_WORKSPACE_CONTEXT as i, UmbWorkspaceRouteManager as n } from "@umbraco-cms/backoffice/workspace";
import { d as e } from "./bundle.manifests-Benbp2LX.js";
const r = "Merchello.Collections.Workspace";
class u extends o {
  constructor(t) {
    super(t, i.toString()), this.workspaceAlias = r, this.#t = new s(this), this.#t.setEntityType(e), this.#t.setUnique("collections"), this.routes = new n(t), this.routes.setRoutes([
      {
        path: "edit/:unique",
        component: () => import("./collections-workspace-editor.element-6_M9t8dz.js"),
        setup: (p, l) => {
        }
      },
      {
        path: "",
        redirectTo: "edit/collections"
      }
    ]);
  }
  #t;
  getEntityType() {
    return e;
  }
  getUnique() {
    return "collections";
  }
}
export {
  r as MERCHELLO_COLLECTIONS_WORKSPACE_ALIAS,
  u as MerchelloCollectionsWorkspaceContext,
  u as api
};
//# sourceMappingURL=collections-workspace.context-CJVJ9la3.js.map
