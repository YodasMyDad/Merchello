import { UmbContextBase as n } from "@umbraco-cms/backoffice/class-api";
import { UmbEntityContext as u } from "@umbraco-cms/backoffice/entity";
import { UMB_WORKSPACE_CONTEXT as p, UmbWorkspaceRouteManager as d } from "@umbraco-cms/backoffice/workspace";
import { UmbObjectState as i, UmbStringState as h, UmbArrayState as c } from "@umbraco-cms/backoffice/observable-api";
import { b as a } from "./bundle.manifests-DpXnf-5Q.js";
import { M as o } from "./merchello-api-Rt7qKkDA.js";
const m = "Merchello.Products.Workspace";
class E extends n {
  constructor(t) {
    super(t, p.toString()), this.workspaceAlias = m, this.#l = new u(this), this.#t = !1, this.#r = new i(void 0), this.product = this.#r.asObservable(), this.#i = new h(void 0), this.variantId = this.#i.asObservable(), this.#n = new i(null), this.elementType = this.#n.asObservable(), this.#s = new i({}), this.elementPropertyValues = this.#s.asObservable(), this.#o = new c([], (e) => e.id), this.filterGroups = this.#o.asObservable(), this.#a = !1, this.#l.setEntityType(a), this.#l.setUnique("products"), this.routes = new d(t), this.routes.setRoutes([
      // Variant detail route
      {
        path: "edit/products/:id/variant/:variantId",
        component: () => import("./variant-detail.element-DklQAORr.js"),
        setup: (e, s) => {
          this.#t = !1;
          const r = s.match.params.id, l = s.match.params.variantId;
          this.#i.setValue(l), this.load(r);
        }
      },
      // Create product route (before :id to avoid matching "create" as an id)
      {
        path: "edit/products/create",
        component: () => import("./product-detail.element-BCnWuyHS.js"),
        setup: () => {
          this.#t = !0, this.#e = void 0, this.#i.setValue(void 0), this.#r.setValue(this._createEmptyProduct());
        }
      },
      // Product detail route (GUID parameter)
      {
        path: "edit/products/:id",
        component: () => import("./product-detail.element-BCnWuyHS.js"),
        setup: (e, s) => {
          this.#t = !1, this.#i.setValue(void 0);
          const r = s.match.params.id;
          this.load(r);
        }
      },
      // Products list route
      {
        path: "edit/products",
        component: () => import("./products-workspace-editor.element-DidDFkSu.js"),
        setup: () => {
          this.#e = void 0, this.#r.setValue(void 0), this.#i.setValue(void 0), this.#t = !1;
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
  #r;
  #i;
  #n;
  #s;
  #o;
  #a;
  getEntityType() {
    return a;
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
    const { data: e, error: s } = await o.getProductDetail(t);
    if (s) {
      console.error("Failed to load product:", s);
      return;
    }
    this.#r.setValue(e);
  }
  async reload() {
    this.#e && await this.load(this.#e);
  }
  updateProduct(t) {
    this.#r.setValue(t), t.id && this.#t && (this.#e = t.id, this.#t = !1), t.elementProperties && this.#s.setValue(t.elementProperties);
  }
  // Element Type Methods
  async loadElementType() {
    const { data: t, error: e } = await o.getProductElementType();
    if (e) {
      console.error("Failed to load element type:", e);
      return;
    }
    this.#n.setValue(t ?? null);
  }
  // Shared Reference Data Methods
  async loadFilterGroups() {
    if (this.#a) return;
    this.#a = !0;
    const { data: t, error: e } = await o.getFilterGroups();
    if (e) {
      this.#a = !1, console.error("Failed to load filter groups:", e);
      return;
    }
    this.#o.setValue(t ?? []);
  }
  getFilterGroups() {
    return this.#o.getValue();
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
//# sourceMappingURL=products-workspace.context-CogYpy20.js.map
