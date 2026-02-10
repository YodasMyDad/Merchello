import { UmbContextBase as n } from "@umbraco-cms/backoffice/class-api";
import { UmbEntityContext as r } from "@umbraco-cms/backoffice/entity";
import { UMB_WORKSPACE_CONTEXT as u, UmbWorkspaceRouteManager as l } from "@umbraco-cms/backoffice/workspace";
import { UmbObjectState as c, UmbBooleanState as i } from "@umbraco-cms/backoffice/observable-api";
import { i as a } from "./bundle.manifests-jAq49lpg.js";
import { b as h, c as d, d as m, D as p, a as g } from "./discount.types-DX82Q6oV.js";
import { M as f } from "./merchello-api-DFeoGYDY.js";
import { g as y } from "./store-settings-BfPYtFfT.js";
const S = "Merchello.Discounts.Workspace";
class L extends n {
  constructor(t) {
    super(t, u.toString()), this.workspaceAlias = S, this.#o = new r(this), this.#e = !1, this.#n = 1e3, this.#s = new c(void 0), this.discount = this.#s.asObservable(), this.#a = new i(!1), this.isLoading = this.#a.asObservable(), this.#r = new i(!1), this.isSaving = this.#r.asObservable(), this.#o.setEntityType(a), this.#o.setUnique("discounts"), this.routes = new l(t), this._loadSettings(), this.routes.setRoutes([
      // Create discount route (before :id to avoid matching "create" as an id)
      {
        path: "edit/discounts/create",
        component: () => import("./discount-detail.element-CfaLVoGw.js"),
        setup: () => {
          this.#e = !0, this.#t = void 0;
          const s = new URLSearchParams(window.location.search).get("category");
          this.#i = s ?? h.AmountOffProducts, this.#s.setValue(this._createEmptyDiscount(this.#i));
        }
      },
      // Discount detail route (GUID parameter)
      {
        path: "edit/discounts/:id",
        component: () => import("./discount-detail.element-CfaLVoGw.js"),
        setup: (e, s) => {
          this.#e = !1;
          const o = s.match.params.id;
          this.load(o);
        }
      },
      // Discounts list route
      {
        path: "edit/discounts",
        component: () => import("./discounts-workspace-editor.element-BB2OEkpu.js"),
        setup: () => {
          this.#t = void 0, this.#s.setValue(void 0), this.#e = !1, this.#i = void 0;
        }
      },
      // Default redirect
      {
        path: "",
        redirectTo: "edit/discounts"
      }
    ]);
  }
  #o;
  // Discount detail state
  #t;
  #e;
  #i;
  #n;
  #s;
  #a;
  #r;
  getEntityType() {
    return a;
  }
  getUnique() {
    return this.#t ?? "discounts";
  }
  get isNew() {
    return this.#e;
  }
  get category() {
    return this.#i;
  }
  // Discount loading and management
  async load(t) {
    this.#t = t, this.#a.setValue(!0);
    const { data: e, error: s } = await f.getDiscount(t);
    if (s) {
      this.#a.setValue(!1);
      return;
    }
    this.#s.setValue(e), this.#i = e?.category, this.#a.setValue(!1);
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
  async _loadSettings() {
    const t = await y();
    this.#n = t.defaultDiscountPriority;
  }
  _createEmptyDiscount(t) {
    const e = (/* @__PURE__ */ new Date()).toISOString();
    return {
      id: "",
      name: "",
      description: null,
      showInFeed: !1,
      feedPromotionName: null,
      status: g.Draft,
      statusLabel: "Draft",
      statusColor: "default",
      category: t,
      categoryLabel: "",
      method: p.Code,
      code: null,
      valueType: m.Percentage,
      value: 0,
      formattedValue: "",
      startsAt: e,
      endsAt: null,
      timezone: null,
      totalUsageLimit: null,
      perCustomerUsageLimit: null,
      perOrderUsageLimit: null,
      currentUsageCount: 0,
      requirementType: d.None,
      requirementValue: null,
      canCombineWithProductDiscounts: !0,
      canCombineWithOrderDiscounts: !0,
      canCombineWithShippingDiscounts: !0,
      applyAfterTax: !1,
      priority: this.#n,
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
  S as MERCHELLO_DISCOUNTS_WORKSPACE_ALIAS,
  L as MerchelloDiscountsWorkspaceContext,
  L as api
};
//# sourceMappingURL=discounts-workspace.context-BxzAZA6v.js.map
