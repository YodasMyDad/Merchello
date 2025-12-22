import { UmbControllerBase as r } from "@umbraco-cms/backoffice/class-api";
import { UMB_WORKSPACE_CONTEXT as i, UmbWorkspaceRouteManager as n } from "@umbraco-cms/backoffice/workspace";
import { UmbObjectState as u, UmbBooleanState as a } from "@umbraco-cms/backoffice/observable-api";
import { d as l, e as c, a as h, D as p, c as m } from "./discount.types-YWYxoniA.js";
import { M as d } from "./merchello-api-B1skiL_A.js";
import { D as g } from "./navigation-m-G5wLvz.js";
class U extends r {
  constructor(t) {
    super(t, i.toString()), this.workspaceAlias = "Merchello.Discount.Detail.Workspace", this.#e = !1, this.#s = new u(void 0), this.discount = this.#s.asObservable(), this.#i = new a(!1), this.isLoading = this.#i.asObservable(), this.#o = new a(!1), this.isSaving = this.#o.asObservable(), this.routes = new n(t), this.provideContext(i, this), this.routes.setRoutes([
      {
        path: "create",
        component: () => import("./discount-detail.element-5IYSk85-.js"),
        setup: () => {
          this.#e = !0, this.#t = void 0;
          const s = new URLSearchParams(window.location.search).get("category");
          this.#a = s ?? l.AmountOffProducts, this.#s.setValue(this._createEmptyDiscount(this.#a));
        }
      },
      {
        path: "edit/:id",
        component: () => import("./discount-detail.element-5IYSk85-.js"),
        setup: (e, s) => {
          this.#e = !1;
          const o = s.match.params.id;
          this.load(o);
        }
      }
    ]);
  }
  #t;
  #e;
  #a;
  #s;
  #i;
  #o;
  getEntityType() {
    return g;
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
    const { data: e, error: s } = await d.getDiscount(t);
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
    this.#o.setValue(t);
  }
  _createEmptyDiscount(t) {
    const e = (/* @__PURE__ */ new Date()).toISOString();
    return {
      id: "",
      name: "",
      description: null,
      status: m.Draft,
      category: t,
      method: p.Code,
      code: null,
      valueType: h.Percentage,
      value: 0,
      startsAt: e,
      endsAt: null,
      timezone: null,
      totalUsageLimit: null,
      perCustomerUsageLimit: null,
      perOrderUsageLimit: null,
      currentUsageCount: 0,
      requirementType: c.None,
      requirementValue: null,
      canCombineWithProductDiscounts: !0,
      canCombineWithOrderDiscounts: !0,
      canCombineWithShippingDiscounts: !0,
      applyAfterTax: !1,
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
  U as MerchelloDiscountDetailWorkspaceContext,
  U as api
};
//# sourceMappingURL=discount-detail-workspace.context-DtEcDfAG.js.map
