import { UmbContextBase as o } from "@umbraco-cms/backoffice/class-api";
import { UmbEntityContext as r } from "@umbraco-cms/backoffice/entity";
import { UMB_WORKSPACE_CONTEXT as s, UmbWorkspaceRouteManager as p } from "@umbraco-cms/backoffice/workspace";
import { f as e } from "./bundle.manifests-Benbp2LX.js";
const i = "Merchello.ProductTypes.Workspace";
class _ extends o {
  constructor(t) {
    super(t, s.toString()), this.workspaceAlias = i, this.#t = new r(this), this.#t.setEntityType(e), this.#t.setUnique("product-types"), this.routes = new p(t), this.routes.setRoutes([
      {
        path: "edit/:unique",
        component: () => import("./product-types-workspace-editor.element-_i5PumqM.js"),
        setup: (c, u) => {
        }
      },
      {
        path: "",
        redirectTo: "edit/product-types"
      }
    ]);
  }
  #t;
  getEntityType() {
    return e;
  }
  getUnique() {
    return "product-types";
  }
}
export {
  i as MERCHELLO_PRODUCT_TYPES_WORKSPACE_ALIAS,
  _ as MerchelloProductTypesWorkspaceContext,
  _ as api
};
//# sourceMappingURL=product-types-workspace.context-OfTMk0HK.js.map
