import { UmbControllerBase as o } from "@umbraco-cms/backoffice/class-api";
import { UMB_WORKSPACE_CONTEXT as i, UmbWorkspaceRouteManager as n } from "@umbraco-cms/backoffice/workspace";
import { UmbObjectState as l, UmbBooleanState as a } from "@umbraco-cms/backoffice/observable-api";
import { M as u } from "./merchello-api-DXy2hS5y.js";
import { D as c } from "./navigation-BP2IjQvn.js";
class y extends o {
  constructor(t) {
    super(t, i.toString()), this.workspaceAlias = "Merchello.Discount.Detail.Workspace", this.#e = !1, this.#s = new l(void 0), this.discount = this.#s.asObservable(), this.#i = new a(!1), this.isLoading = this.#i.asObservable(), this.#r = new a(!1), this.isSaving = this.#r.asObservable(), this.routes = new n(t), this.provideContext(i, this), this.routes.setRoutes([
      {
        path: "create",
        component: () => import("./discount-detail.element-02UTNhUS.js"),
        setup: () => {
          this.#e = !0, this.#t = void 0;
          const s = new URLSearchParams(window.location.search).get("category");
          this.#a = s ? parseInt(s, 10) : 0, this.#s.setValue(this._createEmptyDiscount(this.#a));
        }
      },
      {
        path: "edit/:id",
        component: () => import("./discount-detail.element-02UTNhUS.js"),
        setup: (e, s) => {
          this.#e = !1;
          const r = s.match.params.id;
          this.load(r);
        }
      }
    ]);
  }
  #t;
  #e;
  #a;
  #s;
  #i;
  #r;
  getEntityType() {
    return c;
  }
  getUnique() {
    return this.#t;
  }
  get isNew() {
    return this.#e;
  }
  get category() {
    return this.#a;
  }
  async load(t) {
    this.#t = t, this.#i.setValue(!0);
    const { data: e, error: s } = await u.getDiscount(t);
    if (s) {
      console.error("Failed to load discount:", s), this.#i.setValue(!1);
      return;
    }
    this.#s.setValue(e), this.#a = e?.category, this.#i.setValue(!1);
  }
  async reload() {
    this.#t && await this.load(this.#t);
  }
  updateDiscount(t) {
    this.#s.setValue(t), t.id && this.#e && (this.#t = t.id, this.#e = !1);
  }
  getDiscount() {
    return this.#s.getValue();
  }
  setIsSaving(t) {
    this.#r.setValue(t);
  }
  _createEmptyDiscount(t) {
    const e = (/* @__PURE__ */ new Date()).toISOString();
    return {
      id: "",
      name: "",
      description: null,
      status: 0,
      // Draft
      category: t,
      method: 0,
      // Code
      code: null,
      valueType: 1,
      // Percentage
      value: 0,
      startsAt: e,
      endsAt: null,
      timezone: null,
      totalUsageLimit: null,
      perCustomerUsageLimit: null,
      perOrderUsageLimit: null,
      currentUsageCount: 0,
      requirementType: 0,
      // None
      requirementValue: null,
      canCombineWithProductDiscounts: !0,
      canCombineWithOrderDiscounts: !0,
      canCombineWithShippingDiscounts: !0,
      priority: 1e3,
      dateCreated: e,
      dateUpdated: e,
      createdBy: null,
      targetRules: [],
      eligibilityRules: [],
      buyXGetYConfig: null,
      freeShippingConfig: null
    };
  }
}
export {
  y as MerchelloDiscountDetailWorkspaceContext,
  y as api
};
//# sourceMappingURL=discount-detail-workspace.context-1vpN2HUp.js.map
