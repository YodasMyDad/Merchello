import { UmbContextBase as o } from "@umbraco-cms/backoffice/class-api";
import { UmbEntityContext as r } from "@umbraco-cms/backoffice/entity";
import { UMB_WORKSPACE_CONTEXT as s, UmbWorkspaceRouteManager as i } from "@umbraco-cms/backoffice/workspace";
import { g as e } from "./bundle.manifests-qdQFTCgd.js";
const n = "Merchello.ProductFeed.Workspace";
class _ extends o {
  constructor(t) {
    super(t, s.toString()), this.workspaceAlias = n, this.#t = new r(this), this.#t.setEntityType(e), this.#t.setUnique("product-feed"), this.routes = new i(t), this.routes.setRoutes([
      {
        path: "edit/:unique",
        component: () => import("./product-feed-workspace-editor.element-DvOKytxK.js"),
        setup: (c, u) => {
        }
      },
      {
        path: "",
        redirectTo: "edit/product-feed"
      }
    ]);
  }
  #t;
  getEntityType() {
    return e;
  }
  getUnique() {
    return "product-feed";
  }
}
export {
  n as MERCHELLO_PRODUCT_FEED_WORKSPACE_ALIAS,
  _ as MerchelloProductFeedWorkspaceContext,
  _ as api
};
//# sourceMappingURL=product-feed-workspace.context-CMzMnMMa.js.map
