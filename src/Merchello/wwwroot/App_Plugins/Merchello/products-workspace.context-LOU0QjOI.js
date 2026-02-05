import { UmbContextBase as n } from "@umbraco-cms/backoffice/class-api";
import { UmbEntityContext as u } from "@umbraco-cms/backoffice/entity";
import { UMB_WORKSPACE_CONTEXT as p, UmbWorkspaceRouteManager as h } from "@umbraco-cms/backoffice/workspace";
import { UmbObjectState as a, UmbStringState as d, UmbArrayState as c } from "@umbraco-cms/backoffice/observable-api";
import { b as o } from "./bundle.manifests-gPTAS7__.js";
import { M as r } from "./merchello-api-DkRa4ImO.js";
const m = "Merchello.Products.Workspace";
class E extends n {
  constructor(t) {
    super(t, p.toString()), this.workspaceAlias = m, this.#l = new u(this), this.#t = !1, this.#i = new a(void 0), this.product = this.#i.asObservable(), this.#a = new d(void 0), this.variantId = this.#a.asObservable(), this.#n = new a(null), this.elementType = this.#n.asObservable(), this.#s = new a({}), this.elementPropertyValues = this.#s.asObservable(), this.#r = new c([], (e) => e.id), this.filterGroups = this.#r.asObservable(), this.#o = !1, this.#l.setEntityType(o), this.#l.setUnique("products"), this.routes = new h(t), this.routes.setRoutes([
      // Variant detail route
      {
        path: "edit/products/:id/variant/:variantId",
        component: () => import("./variant-detail.element-mtZZ5s5g.js"),
        setup: (e, s) => {
          this.#t = !1;
          const i = s.match.params.id, l = s.match.params.variantId;
          this.#a.setValue(l), this.load(i);
        }
      },
      // Create product route (before :id to avoid matching "create" as an id)
      {
        path: "edit/products/create",
        component: () => import("./product-detail.element-DuTTh4oA.js"),
        setup: () => {
          this.#t = !0, this.#e = void 0, this.#a.setValue(void 0), this.#i.setValue(this._createEmptyProduct());
        }
      },
      // Product detail route (GUID parameter)
      {
        path: "edit/products/:id",
        component: () => import("./product-detail.element-DuTTh4oA.js"),
        setup: (e, s) => {
          this.#t = !1, this.#a.setValue(void 0);
          const i = s.match.params.id;
          this.load(i);
        }
      },
      // Products list route
      {
        path: "edit/products",
        component: () => import("./products-workspace-editor.element-DidDFkSu.js"),
        setup: () => {
          this.#e = void 0, this.#i.setValue(void 0), this.#a.setValue(void 0), this.#t = !1;
        }
      },
      // Default redirect
      {
        path: "",
        redirectTo: "edit/products"
      }
    ]);
  }
  #l;
  // Product detail state
  #e;
  #t;
  #i;
  #a;
  #n;
  #s;
  #r;
  #o;
  getEntityType() {
    return o;
  }
  getUnique() {
    return this.#e ?? "products";
  }
  get isNew() {
    return this.#t;
  }
  // Product loading and management
  async load(t) {
    this.#e = t;
    const { data: e, error: s } = await r.getProductDetail(t);
    s || this.#i.setValue(e);
  }
  async reload() {
    this.#e && await this.load(this.#e);
  }
  updateProduct(t) {
    this.#i.setValue(t), t.id && this.#t && (this.#e = t.id, this.#t = !1), t.elementProperties && this.#s.setValue(t.elementProperties);
  }
  // Element Type Methods
  async loadElementType() {
    const { data: t, error: e } = await r.getProductElementType();
    e || this.#n.setValue(t ?? null);
  }
  // Shared Reference Data Methods
  async loadFilterGroups() {
    if (this.#o) return;
    this.#o = !0;
    const { data: t, error: e } = await r.getFilterGroups();
    if (e) {
      this.#o = !1;
      return;
    }
    this.#r.setValue(t ?? []);
  }
  getFilterGroups() {
    return this.#r.getValue();
  }
  setElementPropertyValue(t, e) {
    const s = this.#s.getValue();
    this.#s.setValue({ ...s, [t]: e });
  }
  setElementPropertyValues(t) {
    this.#s.setValue(t);
  }
  getElementPropertyValues() {
    return this.#s.getValue();
  }
  _createEmptyProduct() {
    return {
      id: "",
      rootName: "",
      rootImages: [],
      rootUrl: null,
      googleShoppingFeedCategory: null,
      isDigitalProduct: !1,
      aggregateStockStatus: "InStock",
      aggregateStockStatusLabel: "",
      aggregateStockStatusCssClass: "",
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
      collectionIds: [],
      warehouseIds: [],
      productOptions: [],
      variants: [],
      availableShippingOptions: []
    };
  }
}
export {
  m as MERCHELLO_PRODUCTS_WORKSPACE_ALIAS,
  E as MerchelloProductsWorkspaceContext,
  E as api
};
//# sourceMappingURL=products-workspace.context-LOU0QjOI.js.map
