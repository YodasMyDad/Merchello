import { UmbControllerBase as r } from "@umbraco-cms/backoffice/class-api";
import { UMB_WORKSPACE_CONTEXT as i, UmbWorkspaceRouteManager as l } from "@umbraco-cms/backoffice/workspace";
import { UmbObjectState as n, UmbStringState as d } from "@umbraco-cms/backoffice/observable-api";
import { M as p } from "./merchello-api-gshzVGsw.js";
class v extends r {
  constructor(t) {
    super(t, i.toString()), this.workspaceAlias = "Merchello.Product.Detail.Workspace", this.#t = !1, this.#o = new n(void 0), this.product = this.#o.asObservable(), this.#a = new d(void 0), this.variantId = this.#a.asObservable(), this.routes = new l(t), this.provideContext(i, this), this.routes.setRoutes([
      {
        path: "create",
        component: () => import("./product-detail.element-Y48g95vO.js"),
        setup: () => {
          this.#t = !0, this.#e = void 0, this.#a.setValue(void 0), this.#o.setValue(this._createEmptyProduct());
        }
      },
      {
        path: "edit/:id/variant/:variantId",
        component: () => import("./variant-detail.element-CI29G-Nb.js"),
        setup: (o, e) => {
          this.#t = !1;
          const a = e.match.params.id, s = e.match.params.variantId;
          this.#a.setValue(s), this.load(a);
        }
      },
      {
        path: "edit/:id",
        component: () => import("./product-detail.element-Y48g95vO.js"),
        setup: (o, e) => {
          this.#t = !1, this.#a.setValue(void 0);
          const a = e.match.params.id;
          this.load(a);
        }
      }
    ]);
  }
  #e;
  #t;
  #o;
  #a;
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
      isDigitalProduct: !1,
      defaultPackageConfigurations: [],
      description: null,
      metaDescription: null,
      pageTitle: null,
      noIndex: !1,
      openGraphImage: null,
      canonicalUrl: null,
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
  v as MerchelloProductDetailWorkspaceContext,
  v as api
};
//# sourceMappingURL=product-detail-workspace.context-BuBH_zp2.js.map
