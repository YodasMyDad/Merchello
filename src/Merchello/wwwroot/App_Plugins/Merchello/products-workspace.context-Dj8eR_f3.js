import { UmbContextBase as n } from "@umbraco-cms/backoffice/class-api";
import { UmbEntityContext as u } from "@umbraco-cms/backoffice/entity";
import { UMB_WORKSPACE_CONTEXT as p, UmbWorkspaceRouteManager as h } from "@umbraco-cms/backoffice/workspace";
import { UmbObjectState as r, UmbStringState as d, UmbArrayState as c } from "@umbraco-cms/backoffice/observable-api";
import { b as o } from "./bundle.manifests-BpTbgcjM.js";
import { M as a } from "./merchello-api-D-qg1PlO.js";
const m = "Merchello.Products.Workspace";
class E extends n {
  constructor(t) {
    super(t, p.toString()), this.workspaceAlias = m, this.#l = new u(this), this.#t = !1, this.#i = new r(void 0), this.product = this.#i.asObservable(), this.#r = new d(void 0), this.variantId = this.#r.asObservable(), this.#n = new r(null), this.elementType = this.#n.asObservable(), this.#s = new r({}), this.elementPropertyValues = this.#s.asObservable(), this.#a = new c([], (e) => e.id), this.filterGroups = this.#a.asObservable(), this.#o = !1, this.#l.setEntityType(o), this.#l.setUnique("products"), this.routes = new h(t), this.routes.setRoutes([
      // Variant detail route
      {
        path: "edit/products/:id/variant/:variantId",
        component: () => import("./variant-detail.element-D9NGpzmK.js"),
        setup: (e, s) => {
          this.#t = !1;
          const i = s.match.params.id, l = s.match.params.variantId;
          this.#r.setValue(l), this.load(i);
        }
      },
      // Create product route (before :id to avoid matching "create" as an id)
      {
        path: "edit/products/create",
        component: () => import("./product-detail.element-_dDqu3st.js"),
        setup: () => {
          this.#t = !0, this.#e = void 0, this.#r.setValue(void 0), this.#i.setValue(this._createEmptyProduct());
        }
      },
      // Product detail route (GUID parameter)
      {
        path: "edit/products/:id",
        component: () => import("./product-detail.element-_dDqu3st.js"),
        setup: (e, s) => {
          this.#t = !1, this.#r.setValue(void 0);
          const i = s.match.params.id;
          this.load(i);
        }
      },
      // Products list route
      {
        path: "edit/products",
        component: () => import("./products-workspace-editor.element-DidDFkSu.js"),
        setup: () => {
          this.#e = void 0, this.#i.setValue(void 0), this.#r.setValue(void 0), this.#t = !1;
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
  #r;
  #n;
  #s;
  #a;
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
    const { data: e, error: s } = await a.getProductDetail(t);
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
    const { data: t, error: e } = await a.getProductElementType();
    e || this.#n.setValue(t ?? null);
  }
  // Shared Reference Data Methods
  async loadFilterGroups() {
    if (this.#o) return;
    this.#o = !0;
    const { data: t, error: e } = await a.getFilterGroups();
    if (e) {
      this.#o = !1;
      return;
    }
    this.#a.setValue(t ?? []);
  }
  getFilterGroups() {
    return this.#a.getValue();
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
//# sourceMappingURL=products-workspace.context-Dj8eR_f3.js.map
