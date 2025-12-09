import { UmbControllerBase as i } from "@umbraco-cms/backoffice/class-api";
import { UMB_WORKSPACE_CONTEXT as r, UmbWorkspaceRouteManager as a } from "@umbraco-cms/backoffice/workspace";
import { UmbObjectState as l } from "@umbraco-cms/backoffice/observable-api";
import { M as d } from "./merchello-api-C2InYbkz.js";
class m extends i {
  constructor(t) {
    super(t, r.toString()), this.workspaceAlias = "Merchello.Product.Detail.Workspace", this.#e = !1, this.#o = new l(void 0), this.product = this.#o.asObservable(), this.routes = new a(t), this.provideContext(r, this), this.routes.setRoutes([
      {
        path: "create",
        component: () => import("./product-detail.element-KOGAAGL1.js"),
        setup: () => {
          this.#e = !0, this.#t = void 0, this.#o.setValue(this._createEmptyProduct());
        }
      },
      {
        path: "edit/:id",
        component: () => import("./product-detail.element-KOGAAGL1.js"),
        setup: (o, e) => {
          this.#e = !1;
          const s = e.match.params.id;
          this.load(s);
        }
      }
    ]);
  }
  #t;
  #e;
  #o;
  getEntityType() {
    return "merchello-product";
  }
  getUnique() {
    return this.#t;
  }
  get isNew() {
    return this.#e;
  }
  async load(t) {
    this.#t = t;
    const { data: o, error: e } = await d.getProductDetail(t);
    if (e) {
      console.error("Failed to load product:", e);
      return;
    }
    this.#o.setValue(o);
  }
  async reload() {
    this.#t && await this.load(this.#t);
  }
  updateProduct(t) {
    this.#o.setValue(t), t.id && this.#e && (this.#t = t.id, this.#e = !1);
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
  m as MerchelloProductDetailWorkspaceContext,
  m as api
};
//# sourceMappingURL=product-detail-workspace.context-BfA_-E4d.js.map
