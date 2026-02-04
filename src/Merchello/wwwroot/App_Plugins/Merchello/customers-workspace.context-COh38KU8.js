import { UmbContextBase as o } from "@umbraco-cms/backoffice/class-api";
import { UmbEntityContext as a } from "@umbraco-cms/backoffice/entity";
import { UMB_WORKSPACE_CONTEXT as n, UmbWorkspaceRouteManager as m } from "@umbraco-cms/backoffice/workspace";
import { UmbObjectState as h } from "@umbraco-cms/backoffice/observable-api";
import { c as i } from "./bundle.manifests-D6jhUFd6.js";
import { M as p } from "./merchello-api-0px5tmLf.js";
const c = "Merchello.Customers.Workspace";
class f extends o {
  constructor(t) {
    super(t, n.toString()), this.workspaceAlias = c, this.#i = new a(this), this.#e = !1, this.#s = new h(void 0), this.segment = this.#s.asObservable(), this.#i.setEntityType(i), this.#i.setUnique("customers"), this.routes = new m(t), this.routes.setRoutes([
      // Create segment route
      {
        path: "edit/customers/segment/create",
        component: () => import("./segment-detail.element-wLSRIH3Q.js"),
        setup: () => {
          this.#e = !0, this.#t = void 0, this.#s.setValue(this._createEmptySegment());
        }
      },
      // Segment detail route
      {
        path: "edit/customers/segment/:id",
        component: () => import("./segment-detail.element-wLSRIH3Q.js"),
        setup: (s, e) => {
          this.#e = !1;
          const r = e.match.params.id;
          this.loadSegment(r);
        }
      },
      // Customers list route
      {
        path: "edit/customers",
        component: () => import("./customers-workspace-editor.element-TXrxZjT3.js"),
        setup: () => {
          this.#t = void 0, this.#s.setValue(void 0), this.#e = !1;
        }
      },
      // Default redirect
      {
        path: "",
        redirectTo: "edit/customers"
      }
    ]);
  }
  #i;
  // Segment detail state
  #t;
  #e;
  #s;
  getEntityType() {
    return i;
  }
  getUnique() {
    return this.#t ?? "customers";
  }
  get isNew() {
    return this.#e;
  }
  // Segment loading and management
  async loadSegment(t) {
    this.#t = t;
    const { data: s, error: e } = await p.getCustomerSegment(t);
    e || this.#s.setValue(s);
  }
  async reloadSegment() {
    this.#t && await this.loadSegment(this.#t);
  }
  updateSegment(t) {
    this.#s.setValue(t), t.id && this.#e && (this.#t = t.id, this.#e = !1);
  }
  _createEmptySegment() {
    return {
      id: "",
      name: "",
      description: null,
      segmentType: "Manual",
      isActive: !0,
      isSystemSegment: !1,
      memberCount: 0,
      dateCreated: (/* @__PURE__ */ new Date()).toISOString(),
      dateUpdated: (/* @__PURE__ */ new Date()).toISOString(),
      criteria: null,
      matchMode: "All"
    };
  }
}
export {
  c as MERCHELLO_CUSTOMERS_WORKSPACE_ALIAS,
  f as MerchelloCustomersWorkspaceContext,
  f as api
};
//# sourceMappingURL=customers-workspace.context-COh38KU8.js.map
