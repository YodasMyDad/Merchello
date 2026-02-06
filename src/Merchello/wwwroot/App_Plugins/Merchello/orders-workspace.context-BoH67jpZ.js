import { UmbContextBase as i } from "@umbraco-cms/backoffice/class-api";
import { UmbEntityContext as a } from "@umbraco-cms/backoffice/entity";
import { UMB_WORKSPACE_CONTEXT as n, UmbWorkspaceRouteManager as d } from "@umbraco-cms/backoffice/workspace";
import { UmbObjectState as p } from "@umbraco-cms/backoffice/observable-api";
import { a as o } from "./bundle.manifests-CZI-sC33.js";
import { M as h } from "./merchello-api-D_QA1kor.js";
const m = "Merchello.Orders.Workspace";
class _ extends i {
  constructor(t) {
    super(t, n.toString()), this.workspaceAlias = m, this.#r = new a(this), this.#e = new p(void 0), this.order = this.#e.asObservable(), this.#r.setEntityType(o), this.#r.setUnique("orders"), this.routes = new d(t), this.routes.setRoutes([
      // Order detail route (GUID parameter)
      {
        path: "edit/orders/:id",
        component: () => import("./order-detail.element-C43yzzgV.js"),
        setup: (r, e) => {
          const s = e.match.params.id;
          this.load(s);
        }
      },
      // Orders list route
      {
        path: "edit/orders",
        component: () => import("./orders-workspace-editor.element-Dp5oBkmV.js"),
        setup: () => {
          this.#t = void 0, this.#e.setValue(void 0);
        }
      },
      // Default redirect
      {
        path: "",
        redirectTo: "edit/orders"
      }
    ]);
  }
  #r;
  // Order detail state
  #t;
  #e;
  getEntityType() {
    return o;
  }
  getUnique() {
    return this.#t ?? "orders";
  }
  // Order loading
  async load(t) {
    this.#t = t;
    const { data: r, error: e } = await h.getOrder(t);
    e || this.#e.setValue(r);
  }
  async reload() {
    this.#t && await this.load(this.#t);
  }
}
export {
  m as MERCHELLO_ORDERS_WORKSPACE_ALIAS,
  _ as MerchelloOrdersWorkspaceContext,
  _ as api
};
//# sourceMappingURL=orders-workspace.context-BoH67jpZ.js.map
