import { UmbControllerBase as n } from "@umbraco-cms/backoffice/class-api";
import { UMB_WORKSPACE_CONTEXT as o, UmbWorkspaceRouteManager as u } from "@umbraco-cms/backoffice/workspace";
import { UmbObjectState as r, UmbStringState as p } from "@umbraco-cms/backoffice/observable-api";
import { M as i } from "./merchello-api-CkNG-K-m.js";
class y extends n {
  constructor(t) {
    super(t, o.toString()), this.workspaceAlias = "Merchello.Product.Detail.Workspace", this.#t = !1, this.#a = new r(void 0), this.product = this.#a.asObservable(), this.#r = new p(void 0), this.variantId = this.#r.asObservable(), this.#o = new r(null), this.elementType = this.#o.asObservable(), this.#e = new r({}), this.elementPropertyValues = this.#e.asObservable(), this.routes = new u(t), this.provideContext(o, this), this.routes.setRoutes([
      {
        path: "create",
        component: () => import("./product-detail.element-CHJBj_-X.js"),
        setup: () => {
          this.#t = !0, this.#s = void 0, this.#r.setValue(void 0), this.#a.setValue(this._createEmptyProduct());
        }
      },
      {
        path: "edit/:id/variant/:variantId",
        component: () => import("./variant-detail.element-DBKu8r9O.js"),
        setup: (s, e) => {
          this.#t = !1;
          const a = e.match.params.id, l = e.match.params.variantId;
          this.#r.setValue(l), this.load(a);
        }
      },
      {
        path: "edit/:id",
        component: () => import("./product-detail.element-CHJBj_-X.js"),
        setup: (s, e) => {
          this.#t = !1, this.#r.setValue(void 0);
          const a = e.match.params.id;
          this.load(a);
        }
      }
    ]);
  }
  #s;
  #t;
  #a;
  #r;
  #o;
  #e;
  getEntityType() {
    return "merchello-product";
  }
  getUnique() {
    return this.#s;
  }
  get isNew() {
    return this.#t;
  }
  async load(t) {
    this.#s = t;
    const { data: s, error: e } = await i.getProductDetail(t);
    if (e) {
      console.error("Failed to load product:", e);
      return;
    }
    this.#a.setValue(s);
  }
  async reload() {
    this.#s && await this.load(this.#s);
  }
  updateProduct(t) {
    this.#a.setValue(t), t.id && this.#t && (this.#s = t.id, this.#t = !1), t.elementProperties && this.#e.setValue(t.elementProperties);
  }
  // Element Type Methods
  async loadElementType() {
    const { data: t, error: s } = await i.getProductElementType();
    if (s) {
      console.error("Failed to load element type:", s);
      return;
    }
    this.#o.setValue(t ?? null);
  }
  setElementPropertyValue(t, s) {
    const e = this.#e.getValue();
    this.#e.setValue({ ...e, [t]: s });
  }
  setElementPropertyValues(t) {
    this.#e.setValue(t);
  }
  getElementPropertyValues() {
    return this.#e.getValue();
  }
  _createEmptyProduct() {
    return {
      id: "",
      rootName: "",
      rootImages: [],
      rootUrl: null,
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
  y as MerchelloProductDetailWorkspaceContext,
  y as api
};
//# sourceMappingURL=product-detail-workspace.context-BRSywhH_.js.map
