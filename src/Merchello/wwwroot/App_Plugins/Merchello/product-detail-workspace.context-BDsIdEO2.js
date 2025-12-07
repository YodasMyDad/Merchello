import { UmbControllerBase as s } from "@umbraco-cms/backoffice/class-api";
import { UMB_WORKSPACE_CONTEXT as e, UmbWorkspaceRouteManager as i } from "@umbraco-cms/backoffice/workspace";
import { UmbObjectState as a } from "@umbraco-cms/backoffice/observable-api";
class h extends s {
  constructor(t) {
    super(t, e.toString()), this.workspaceAlias = "Merchello.Product.Detail.Workspace", this.#t = new a(void 0), this.product = this.#t.asObservable(), this.routes = new i(t), this.provideContext(e, this), this.routes.setRoutes([
      {
        path: "edit/:id",
        component: () => import("./product-detail.element-CdHcxr3X.js"),
        setup: (p, o) => {
          const r = o.match.params.id;
          this.load(r);
        }
      }
    ]);
  }
  #e;
  #t;
  getEntityType() {
    return "merchello-product";
  }
  getUnique() {
    return this.#e;
  }
  async load(t) {
    this.#e = t, this.#t.setValue({
      id: t,
      productRootId: t,
      name: "Loading...",
      sku: null,
      price: 0
    });
  }
}
export {
  h as MerchelloProductDetailWorkspaceContext,
  h as api
};
//# sourceMappingURL=product-detail-workspace.context-BDsIdEO2.js.map
