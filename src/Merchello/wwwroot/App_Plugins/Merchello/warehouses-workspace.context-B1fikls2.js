import { UmbContextBase as a } from "@umbraco-cms/backoffice/class-api";
import { UmbEntityContext as r } from "@umbraco-cms/backoffice/entity";
import { UMB_WORKSPACE_CONTEXT as h, UmbWorkspaceRouteManager as n } from "@umbraco-cms/backoffice/workspace";
import { UmbObjectState as p } from "@umbraco-cms/backoffice/observable-api";
import { k as o } from "./bundle.manifests-DpXnf-5Q.js";
import { M as d } from "./merchello-api-Rt7qKkDA.js";
const u = "Merchello.Warehouses.Workspace";
class S extends a {
  constructor(e) {
    super(e, h.toString()), this.workspaceAlias = u, this.#o = new r(this), this.#t = !1, this.#s = new p(void 0), this.warehouse = this.#s.asObservable(), this.#o.setEntityType(o), this.#o.setUnique("warehouses"), this.routes = new n(e), this.routes.setRoutes([
      // Create warehouse route (before :id to avoid matching "create" as an id)
      {
        path: "edit/warehouses/create",
        component: () => import("./warehouse-detail.element-DPZec-1v.js"),
        setup: () => {
          this.#t = !0, this.#e = void 0, this.#s.setValue(this._createEmptyWarehouse());
        }
      },
      // Warehouse detail route (GUID parameter)
      {
        path: "edit/warehouses/:id",
        component: () => import("./warehouse-detail.element-DPZec-1v.js"),
        setup: (s, t) => {
          this.#t = !1;
          const i = t.match.params.id;
          this.load(i);
        }
      },
      // Warehouses list route
      {
        path: "edit/warehouses",
        component: () => import("./warehouses-workspace-editor.element-CNZk5lYU.js"),
        setup: () => {
          this.#e = void 0, this.#s.setValue(void 0), this.#t = !1;
        }
      },
      // Default redirect
      {
        path: "",
        redirectTo: "edit/warehouses"
      }
    ]);
  }
  #o;
  // Warehouse detail state
  #e;
  #t;
  #s;
  getEntityType() {
    return o;
  }
  getUnique() {
    return this.#e ?? "warehouses";
  }
  get isNew() {
    return this.#t;
  }
  // Warehouse loading and management
  async load(e) {
    this.#e = e;
    const { data: s, error: t } = await d.getWarehouseDetail(e);
    if (t) {
      console.error("Failed to load warehouse:", t);
      return;
    }
    this.#s.setValue(s);
  }
  async reload() {
    this.#e && await this.load(this.#e);
  }
  updateWarehouse(e) {
    this.#s.setValue(e), e.id && this.#t && (this.#e = e.id, this.#t = !1);
  }
  _createEmptyWarehouse() {
    return {
      id: "",
      name: "",
      code: "",
      supplierId: void 0,
      supplierName: void 0,
      address: {
        name: "",
        company: "",
        addressOne: "",
        addressTwo: "",
        townCity: "",
        countyState: "",
        countyStateCode: "",
        postalCode: "",
        country: "",
        countryCode: "",
        email: "",
        phone: ""
      },
      serviceRegions: [],
      shippingOptionCount: 0,
      dateCreated: (/* @__PURE__ */ new Date()).toISOString(),
      dateUpdated: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
}
export {
  u as MERCHELLO_WAREHOUSES_WORKSPACE_ALIAS,
  S as MerchelloWarehousesWorkspaceContext,
  S as api
};
//# sourceMappingURL=warehouses-workspace.context-B1fikls2.js.map
