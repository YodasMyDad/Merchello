import { UmbContextBase as n } from "@umbraco-cms/backoffice/class-api";
import { UmbEntityContext as u } from "@umbraco-cms/backoffice/entity";
import { UMB_WORKSPACE_CONTEXT as p, UmbWorkspaceRouteManager as h } from "@umbraco-cms/backoffice/workspace";
import { UmbObjectState as a, UmbStringState as d, UmbArrayState as c } from "@umbraco-cms/backoffice/observable-api";
import { b as o } from "./bundle.manifests-BN1Pqtvn.js";
import { M as r } from "./merchello-api-Dp_zU_yi.js";
const m = "Merchello.Products.Workspace";
class P extends n {
  constructor(t) {
    super(t, p.toString()), this.workspaceAlias = m, this.#n = new u(this), this.#e = !1, this.#i = new a(void 0), this.product = this.#i.asObservable(), this.#a = new d(void 0), this.variantId = this.#a.asObservable(), this.#r = new a(null), this.elementType = this.#r.asObservable(), this.#t = new a({}), this.elementPropertyValues = this.#t.asObservable(), this.#o = new c([], (e) => e.id), this.filterGroups = this.#o.asObservable(), this.#l = !1, this.#n.setEntityType(o), this.#n.setUnique("products"), this.routes = new h(t), this.routes.setRoutes([
      // Variant detail route
      {
        path: "edit/products/:id/variant/:variantId",
        component: () => import("./variant-detail.element-DWxcU9sN.js"),
        setup: (e, s) => {
          this.#e = !1;
          const i = s.match.params.id, l = s.match.params.variantId;
          this.#a.setValue(l), this.load(i);
        }
      },
      // Create product route (before :id to avoid matching "create" as an id)
      {
        path: "edit/products/create",
        component: () => import("./product-detail.element-B5agcF98.js"),
        setup: () => {
          this.#e = !0, this.#s = void 0, this.#a.setValue(void 0), this._resetElementTypeState(), this.#i.setValue(this._createEmptyProduct());
        }
      },
      // Product detail route (GUID parameter)
      {
        path: "edit/products/:id",
        component: () => import("./product-detail.element-B5agcF98.js"),
        setup: (e, s) => {
          this.#e = !1, this.#a.setValue(void 0);
          const i = s.match.params.id;
          this.load(i);
        }
      },
      // Products list route
      {
        path: "edit/products",
        component: () => import("./products-workspace-editor.element-DidDFkSu.js"),
        setup: () => {
          this.#s = void 0, this.#i.setValue(void 0), this.#a.setValue(void 0), this.#e = !1, this._resetElementTypeState();
        }
      },
      // Default redirect
      {
        path: "",
        redirectTo: "edit/products"
      }
    ]);
  }
  #n;
  // Product detail state
  #s;
  #e;
  #i;
  #a;
  #r;
  #t;
  #o;
  #l;
  getEntityType() {
    return o;
  }
  getUnique() {
    return this.#s ?? "products";
  }
  get isNew() {
    return this.#e;
  }
  // Product loading and management
  async load(t) {
    this.#s = t;
    const { data: e, error: s } = await r.getProductDetail(t);
    if (s) {
      this._resetElementTypeState();
      return;
    }
    this.#i.setValue(e), this.#t.setValue(e?.elementProperties ?? {}), await this.loadElementType(e?.elementTypeAlias ?? null);
  }
  async reload() {
    this.#s && await this.load(this.#s);
  }
  updateProduct(t) {
    this.#i.setValue(t), t.id && this.#e && (this.#s = t.id, this.#e = !1), this.#t.setValue(t.elementProperties ?? {}), this.loadElementType(t.elementTypeAlias ?? null).catch(() => {
    });
  }
  // Element Type Methods
  async loadElementType(t) {
    if (!t) {
      this.#r.setValue(null);
      return;
    }
    const { data: e, error: s } = await r.getProductElementType(t);
    s || this.#r.setValue(e ?? null);
  }
  // Shared Reference Data Methods
  async loadFilterGroups() {
    if (this.#l) return;
    this.#l = !0;
    const { data: t, error: e } = await r.getFilterGroups();
    if (e) {
      this.#l = !1;
      return;
    }
    this.#o.setValue(t ?? []);
  }
  getFilterGroups() {
    return this.#o.getValue();
  }
  setElementPropertyValue(t, e) {
    const s = this.#t.getValue();
    this.#t.setValue({ ...s, [t]: e });
  }
  setElementPropertyValues(t) {
    this.#t.setValue(t);
  }
  getElementPropertyValues() {
    return this.#t.getValue();
  }
  _resetElementTypeState() {
    this.#r.setValue(null), this.#t.setValue({});
  }
  _createEmptyProduct() {
    return {
      id: "",
      rootName: "",
      rootImages: [],
      rootUrl: null,
      googleShoppingFeedCategory: null,
      shoppingFeedBrand: null,
      shoppingFeedCondition: "new",
      isDigitalProduct: !1,
      digitalDeliveryMethod: null,
      digitalFileIds: null,
      downloadLinkExpiryDays: null,
      maxDownloadsPerLink: null,
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
      elementTypeAlias: null,
      elementProperties: {},
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
  P as MerchelloProductsWorkspaceContext,
  P as api
};
//# sourceMappingURL=products-workspace.context-BX9Pi8Ev.js.map
