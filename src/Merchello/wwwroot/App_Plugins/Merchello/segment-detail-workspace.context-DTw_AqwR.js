import { UmbControllerBase as a } from "@umbraco-cms/backoffice/class-api";
import { UMB_WORKSPACE_CONTEXT as i, UmbWorkspaceRouteManager as o } from "@umbraco-cms/backoffice/workspace";
import { UmbObjectState as n } from "@umbraco-cms/backoffice/observable-api";
import { M as m } from "./merchello-api-B2ha_6NF.js";
class u extends a {
  constructor(e) {
    super(e, i.toString()), this.workspaceAlias = "Merchello.CustomerSegment.Detail.Workspace", this.#t = !1, this.#s = new n(void 0), this.segment = this.#s.asObservable(), this.routes = new o(e), this.provideContext(i, this), this.routes.setRoutes([
      {
        path: "create",
        component: () => import("./segment-detail.element-DiLM-rhD.js"),
        setup: () => {
          this.#t = !0, this.#e = void 0, this.#s.setValue(this._createEmptySegment());
        }
      },
      {
        path: "edit/:id",
        component: () => import("./segment-detail.element-DiLM-rhD.js"),
        setup: (s, t) => {
          this.#t = !1;
          const r = t.match.params.id;
          this.load(r);
        }
      }
    ]);
  }
  #e;
  #t;
  #s;
  getEntityType() {
    return "merchello-customer-segment";
  }
  getUnique() {
    return this.#e;
  }
  get isNew() {
    return this.#t;
  }
  async load(e) {
    this.#e = e;
    const { data: s, error: t } = await m.getCustomerSegment(e);
    if (t) {
      console.error("Failed to load segment:", t);
      return;
    }
    this.#s.setValue(s);
  }
  async reload() {
    this.#e && await this.load(this.#e);
  }
  updateSegment(e) {
    this.#s.setValue(e), e.id && this.#t && (this.#e = e.id, this.#t = !1);
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
  u as MerchelloSegmentDetailWorkspaceContext,
  u as api
};
//# sourceMappingURL=segment-detail-workspace.context-DTw_AqwR.js.map
