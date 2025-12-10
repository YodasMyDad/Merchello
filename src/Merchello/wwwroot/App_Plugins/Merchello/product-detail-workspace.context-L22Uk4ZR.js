import { UmbControllerBase as r } from "@umbraco-cms/backoffice/class-api";
import { UMB_WORKSPACE_CONTEXT as i, UmbWorkspaceRouteManager as d } from "@umbraco-cms/backoffice/workspace";
import { UmbObjectState as l, UmbStringState as n } from "@umbraco-cms/backoffice/observable-api";
import { M as p } from "./merchello-api-C2InYbkz.js";
class g extends r {
  constructor(t) {
    super(t, i.toString()), this.workspaceAlias = "Merchello.Product.Detail.Workspace", this.#t = !1, this.#o = new l(void 0), this.product = this.#o.asObservable(), this.#s = new n(void 0), this.variantId = this.#s.asObservable(), this.routes = new d(t), this.provideContext(i, this), this.routes.setRoutes([
      {
        path: "create",
        component: () => import("./product-detail.element-CAk4L34n.js"),
        setup: () => {
          this.#t = !0, this.#e = void 0, this.#s.setValue(void 0), this.#o.setValue(this._createEmptyProduct());
        }
      },
      {
        path: "edit/:id/variant/:variantId",
        component: () => import("./variant-detail.element-BVyVrlFm.js"),
        setup: (o, e) => {
          this.#t = !1;
          const s = e.match.params.id, a = e.match.params.variantId;
          this.#s.setValue(a), this.load(s);
        }
      },
      {
        path: "edit/:id",
        component: () => import("./product-detail.element-CAk4L34n.js"),
        setup: (o, e) => {
          this.#t = !1, this.#s.setValue(void 0);
          const s = e.match.params.id;
          this.load(s);
        }
      }
    ]);
  }
  #e;
  #t;
  #o;
  #s;
  getEntityType() {
    return "merchello-product";
  }
  getUnique() {
    return this.#e;
  }
  get isNew() {
    return this.#t;
  }
  async load(t) {
    this.#e = t;
    const { data: o, error: e } = await p.getProductDetail(t);
    if (e) {
      console.error("Failed to load product:", e);
      return;
    }
    this.#o.setValue(o);
  }
  async reload() {
    this.#e && await this.load(this.#e);
  }
  updateProduct(t) {
    this.#o.setValue(t), t.id && this.#t && (this.#e = t.id, this.#t = !1);
  }
  _createEmptyProduct() {
    return {
      id: "",
      rootName: "",
      rootImages: [],
      rootUrl: null,
      sellingPoints: [],
      videos: [],
      googleShoppingFeedCategory: null,
      hsCode: null,
      isDigitalProduct: !1,
      taxGroupId: "",
      taxGroupName: null,
      productTypeId: "",
      productTypeName: null,
      categoryIds: [],
      warehouseIds: [],
      productOptions: [],
      variants: []
    };
  }
}
export {
  g as MerchelloProductDetailWorkspaceContext,
  g as api
};
//# sourceMappingURL=product-detail-workspace.context-L22Uk4ZR.js.map
