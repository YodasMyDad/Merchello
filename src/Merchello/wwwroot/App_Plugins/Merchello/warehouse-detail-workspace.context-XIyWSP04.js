import { UmbControllerBase as r } from "@umbraco-cms/backoffice/class-api";
import { UMB_WORKSPACE_CONTEXT as o, UmbWorkspaceRouteManager as i } from "@umbraco-cms/backoffice/workspace";
import { UmbObjectState as n } from "@umbraco-cms/backoffice/observable-api";
import { M as h } from "./merchello-api-DXy2hS5y.js";
class m extends r {
  constructor(e) {
    super(e, o.toString()), this.workspaceAlias = "Merchello.Warehouse.Detail.Workspace", this.#t = !1, this.#s = new n(void 0), this.warehouse = this.#s.asObservable(), this.routes = new i(e), this.provideContext(o, this), this.routes.setRoutes([
      {
        path: "create",
        component: () => import("./warehouse-detail.element-CEuq3NO8.js"),
        setup: () => {
          this.#t = !0, this.#e = void 0, this.#s.setValue(this._createEmptyWarehouse());
        }
      },
      {
        path: "edit/:id",
        component: () => import("./warehouse-detail.element-CEuq3NO8.js"),
        setup: (s, t) => {
          this.#t = !1;
          const a = t.match.params.id;
          this.load(a);
        }
      }
    ]);
  }
  #e;
  #t;
  #s;
  getEntityType() {
    return "merchello-warehouse";
  }
  getUnique() {
    return this.#e;
  }
  get isNew() {
    return this.#t;
  }
  async load(e) {
    this.#e = e;
    const { data: s, error: t } = await h.getWarehouseDetail(e);
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
  m as MerchelloWarehouseDetailWorkspaceContext,
  m as api
};
//# sourceMappingURL=warehouse-detail-workspace.context-XIyWSP04.js.map
