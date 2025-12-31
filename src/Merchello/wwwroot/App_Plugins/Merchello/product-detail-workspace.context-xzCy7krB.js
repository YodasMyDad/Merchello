import { UmbControllerBase as n } from "@umbraco-cms/backoffice/class-api";
import { UMB_WORKSPACE_CONTEXT as o, UmbWorkspaceRouteManager as u } from "@umbraco-cms/backoffice/workspace";
import { UmbObjectState as a, UmbStringState as p, UmbArrayState as h } from "@umbraco-cms/backoffice/observable-api";
import { M as i } from "./merchello-api-B2ha_6NF.js";
class y extends n {
  constructor(t) {
    super(t, o.toString()), this.workspaceAlias = "Merchello.Product.Detail.Workspace", this.#t = !1, this.#s = new a(void 0), this.product = this.#s.asObservable(), this.#a = new p(void 0), this.variantId = this.#a.asObservable(), this.#l = new a(null), this.elementType = this.#l.asObservable(), this.#e = new a({}), this.elementPropertyValues = this.#e.asObservable(), this.#i = new h([], (e) => e.id), this.filterGroups = this.#i.asObservable(), this.#o = !1, this.routes = new u(t), this.provideContext(o, this), this.routes.setRoutes([
      {
        path: "create",
        component: () => import("./product-detail.element-BDSg1nJT.js"),
        setup: () => {
          this.#t = !0, this.#r = void 0, this.#a.setValue(void 0), this.#s.setValue(this._createEmptyProduct());
        }
      },
      {
        path: "edit/:id/variant/:variantId",
        component: () => import("./variant-detail.element-Bh7JfHft.js"),
        setup: (e, r) => {
          this.#t = !1;
          const s = r.match.params.id, l = r.match.params.variantId;
          this.#a.setValue(l), this.load(s);
        }
      },
      {
        path: "edit/:id",
        component: () => import("./product-detail.element-BDSg1nJT.js"),
        setup: (e, r) => {
          this.#t = !1, this.#a.setValue(void 0);
          const s = r.match.params.id;
          this.load(s);
        }
      }
    ]);
  }
  #r;
  #t;
  #s;
  #a;
  #l;
  #e;
  #i;
  #o;
  getEntityType() {
    return "merchello-product";
  }
  getUnique() {
    return this.#r;
  }
  get isNew() {
    return this.#t;
  }
  async load(t) {
    this.#r = t;
    const { data: e, error: r } = await i.getProductDetail(t);
    if (r) {
      console.error("Failed to load product:", r);
      return;
    }
    this.#s.setValue(e);
  }
  async reload() {
    this.#r && await this.load(this.#r);
  }
  updateProduct(t) {
    this.#s.setValue(t), t.id && this.#t && (this.#r = t.id, this.#t = !1), t.elementProperties && this.#e.setValue(t.elementProperties);
  }
  // Element Type Methods
  async loadElementType() {
    const { data: t, error: e } = await i.getProductElementType();
    if (e) {
      console.error("Failed to load element type:", e);
      return;
    }
    this.#l.setValue(t ?? null);
  }
  // Shared Reference Data Methods
  /**
   * Loads filter groups if not already loaded.
   * Centralized here to avoid duplicate API calls from multiple components.
   */
  async loadFilterGroups() {
    if (this.#o) return;
    this.#o = !0;
    const { data: t, error: e } = await i.getFilterGroups();
    if (e) {
      this.#o = !1, console.error("Failed to load filter groups:", e);
      return;
    }
    this.#i.setValue(t ?? []);
  }
  /** Gets the current filter groups synchronously */
  getFilterGroups() {
    return this.#i.getValue();
  }
  setElementPropertyValue(t, e) {
    const r = this.#e.getValue();
    this.#e.setValue({ ...r, [t]: e });
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
      collectionIds: [],
      warehouseIds: [],
      productOptions: [],
      variants: [],
      availableShippingOptions: []
    };
  }
}
export {
  y as MerchelloProductDetailWorkspaceContext,
  y as api
};
//# sourceMappingURL=product-detail-workspace.context-xzCy7krB.js.map
