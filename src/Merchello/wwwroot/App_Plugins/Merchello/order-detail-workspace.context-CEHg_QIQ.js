import { UmbControllerBase as i } from "@umbraco-cms/backoffice/class-api";
import { UMB_WORKSPACE_CONTEXT as o, UmbWorkspaceRouteManager as a } from "@umbraco-cms/backoffice/workspace";
import { UmbObjectState as d } from "@umbraco-cms/backoffice/observable-api";
import { M as l } from "./merchello-api-DXy2hS5y.js";
class u extends i {
  constructor(e) {
    super(e, o.toString()), this.workspaceAlias = "Merchello.Order.Detail.Workspace", this.#e = new d(void 0), this.order = this.#e.asObservable(), this.routes = new a(e), this.provideContext(o, this), this.routes.setRoutes([
      {
        path: "edit/:id",
        component: () => import("./order-detail.element-ZlsWlICN.js"),
        setup: (t, r) => {
          const s = r.match.params.id;
          this.load(s);
        }
      }
    ]);
  }
  #r;
  #e;
  getEntityType() {
    return "merchello-order";
  }
  getUnique() {
    return this.#r;
  }
  async load(e) {
    this.#r = e;
    const { data: t, error: r } = await l.getOrder(e);
    if (r) {
      console.error("Failed to load order:", r);
      return;
    }
    this.#e.setValue(t);
  }
}
export {
  u as MerchelloOrderDetailWorkspaceContext,
  u as api
};
//# sourceMappingURL=order-detail-workspace.context-CEHg_QIQ.js.map
